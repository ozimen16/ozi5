-- Create function to generate unique username
CREATE OR REPLACE FUNCTION public.generate_unique_username(base_username TEXT)
RETURNS TEXT AS $$
DECLARE
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  final_username := base_username;
  
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  final_username := public.generate_unique_username(base_username);
  
  INSERT INTO public.profiles (user_id, username, balance)
  VALUES (NEW.id, final_username, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
  base_username TEXT;
  final_username TEXT;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.user_id
    WHERE p.user_id IS NULL
  LOOP
    base_username := COALESCE(
      user_record.raw_user_meta_data->>'username',
      split_part(user_record.email, '@', 1)
    );
    
    final_username := public.generate_unique_username(base_username);
    
    INSERT INTO public.profiles (user_id, username, balance)
    VALUES (user_record.id, final_username, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;