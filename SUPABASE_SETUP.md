# Supabase Setup Guide

## Overview

This project is configured to use Supabase for backend services (database, auth, storage, etc.).

## Getting Started

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in your project details and wait for it to be created

### 2. Get Your Supabase Credentials

1. Once your project is created, go to Project Settings (gear icon)
2. Navigate to the "API" section
3. Copy the following values:
   - **Project URL** (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Configure Environment Variables

1. Open the `.env` file in the project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Using Supabase in Your App

The Supabase client is available at `app/lib/supabase.ts`. Import it in any component:

```typescript
import { supabase } from '~/lib/supabase';

// Example: Fetch data
const { data, error } = await supabase
  .from('your_table')
  .select('*');

// Example: Authentication
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});
```

## Common Supabase Operations

### Authentication

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Database Operations

```typescript
// Select
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' });

// Update
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', 1);

// Delete
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', 1);
```

### Real-time Subscriptions

```typescript
const channel = supabase
  .channel('table_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'table_name' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// Don't forget to unsubscribe when done
channel.unsubscribe();
```

### Storage

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('bucket_name')
  .upload('file_path.jpg', file);

// Download file
const { data, error } = await supabase.storage
  .from('bucket_name')
  .download('file_path.jpg');

// Get public URL
const { data } = supabase.storage
  .from('bucket_name')
  .getPublicUrl('file_path.jpg');
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Router Documentation](https://reactrouter.com/en/main)

## Troubleshooting

### Environment Variables Not Loading

Make sure:
1. Your `.env` file is in the project root
2. Environment variable names start with `VITE_`
3. You've restarted the dev server after modifying `.env`

### CORS Errors

Check your Supabase project settings to ensure your local development URL is allowed.

