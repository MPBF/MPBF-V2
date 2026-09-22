# Customer table columns

## Goal

Show only the operationally required columns in the Customers page desktop table:

1. `م` — one-based sequence number for the currently displayed result set.
2. Arabic name.
3. English name.
4. Drawer number.
5. Sales representative name.
6. Action.

The phone column and all other existing desktop customer-table columns are excluded.

## Design

The customer list API will use a left join from `customers.sales_rep_id` to
`users.id`, returning the representative's preferred Arabic display name and
an English fallback. This preserves customers that do not yet have a sales
representative; the client renders an em dash for that value.

The Customers page configuration will define only the Arabic name, English
name, drawer number, and representative columns. The generic entity table
will receive a display-only sequence column for this page, calculated from
the row's position in the current list. Existing edit and delete action
controls remain unchanged.

## Validation

Run TypeScript checking and build the client. Verify the customer list API
returns representative display fields and that the page presents precisely
the six requested headers without a phone column.
