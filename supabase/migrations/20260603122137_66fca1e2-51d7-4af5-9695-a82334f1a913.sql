UPDATE auth.users
SET encrypted_password = crypt('Mkt@2026!', gen_salt('bf')),
    updated_at = now()
WHERE id = 'c5d63394-d3ad-4d68-80ff-d35090f449c7';