UPDATE auth.users
SET encrypted_password = crypt('Kennedy10@', gen_salt('bf')),
    updated_at = now()
WHERE email = 'kennedmylobo@gmail.com';