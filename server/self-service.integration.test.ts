import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { pool } from "./db";

const base = process.env.TEST_APP_URL || "http://127.0.0.1:5000";

test("employee self-service flows and admin access stay isolated", { timeout: 90000 }, async () => {
  const roles: number[] = [];
  const users: number[] = [];
  const password = randomUUID();
  const hash = await bcrypt.hash(password, 4);
  const prefix = `test_self_${randomUUID().slice(0, 8)}`;
  async function createUser(suffix: string, isAdmin = false) {
    const role = await pool.query(
      "INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING id",
      [`${prefix}_${suffix}`, JSON.stringify(isAdmin ? ["admin"] : [])],
    );
    roles.push(role.rows[0].id);
    const user = await pool.query(
      "INSERT INTO users (username, password, role_id, status, display_name_ar, must_change_password) VALUES ($1, $2, $3, 'active', $4, false) RETURNING id",
      [`${prefix}_${suffix}`, hash, role.rows[0].id, suffix],
    );
    users.push(user.rows[0].id);
    const login = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: `${prefix}_${suffix}`, password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    return { id: user.rows[0].id as number, cookie };
  }
  async function request(cookie: string, path: string, method = "GET", body?: unknown) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }

  try {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const admin = await createUser("admin", true);
    assert.equal((await request(alice.cookie, "/dashboard")).status, 403);
    assert.equal((await request(alice.cookie, "/self/admin/requests")).status, 403);
    assert.equal((await request(admin.cookie, "/dashboard")).status, 200);

    assert.equal((await request(alice.cookie, "/self/attendance", "POST", { action: "check_in" })).status, 400);
    assert.equal((await request(alice.cookie, "/self/attendance", "POST", {
      action: "check_in", latitude: 100, longitude: 46, accuracy: 15,
    })).status, 400);
    const location = { latitude: 24.7136, longitude: 46.6753, accuracy: 15 };
    const concurrent = await Promise.all([
      request(alice.cookie, "/self/attendance", "POST", { action: "check_in", ...location }),
      request(alice.cookie, "/self/attendance", "POST", { action: "check_in", ...location }),
    ]);
    assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 409]);
    assert.equal((await request(bob.cookie, "/self/attendance")).body.events.length, 0);
    assert.equal((await request(alice.cookie, "/self/attendance")).body.status, "working");
    for (const action of ["break_start", "break_end", "check_out"]) {
      assert.equal((await request(alice.cookie, "/self/attendance", "POST", { action, ...location })).status, 200);
    }
    assert.equal((await request(alice.cookie, "/self/attendance")).body.status, "out");

    const message = await request(alice.cookie, "/self/messages", "POST", { recipient_id: bob.id, body: "رسالة اختبار" });
    assert.equal(message.status, 201);
    assert.equal((await request(bob.cookie, "/self/messages")).body.length, 1);
    assert.equal((await request(admin.cookie, "/self/messages")).body.length, 0);
    assert.equal((await request(admin.cookie, `/self/messages/${message.body.id}/read`, "POST")).status, 404);
    assert.equal((await request(bob.cookie, `/self/messages/${message.body.id}/read`, "POST")).status, 200);

    const created = await request(alice.cookie, "/self/requests", "POST", {
      type: "leave", title: "طلب اختبار", details: "تفاصيل اختبار",
    });
    assert.equal(created.status, 201);
    assert.equal((await request(bob.cookie, "/self/requests")).body.length, 0);
    assert.equal((await request(admin.cookie, "/self/admin/requests")).body.some((row: { id: number }) => row.id === created.body.id), true);
    assert.equal((await request(admin.cookie, `/self/admin/requests/${created.body.id}`, "PATCH", {
      status: "approved", response: "تمت الموافقة",
    })).status, 200);
    const ownRequests = await request(alice.cookie, "/self/requests");
    assert.equal(ownRequests.body[0].response, "تمت الموافقة");

    const violation = await request(admin.cookie, "/self/admin/violations", "POST", {
      user_id: alice.id, title: "ملاحظة اختبار", details: "تفاصيل اختبار",
    });
    assert.equal(violation.status, 201);
    assert.equal((await request(bob.cookie, "/self/violations")).body.length, 0);
    assert.equal((await request(bob.cookie, `/self/violations/${violation.body.id}/ack`, "POST")).status, 404);
    assert.equal((await request(alice.cookie, `/self/violations/${violation.body.id}/ack`, "POST")).status, 200);
    assert.ok((await request(alice.cookie, "/self/violations")).body[0].acknowledged_at);
  } finally {
    if (users.length) {
      await pool.query("DELETE FROM sessions WHERE sess->>'userId' = ANY($1::text[])", [users.map(String)]);
      await pool.query("DELETE FROM users WHERE id = ANY($1::integer[])", [users]);
    }
    if (roles.length) await pool.query("DELETE FROM roles WHERE id = ANY($1::integer[])", [roles]);
    await pool.end();
  }
});