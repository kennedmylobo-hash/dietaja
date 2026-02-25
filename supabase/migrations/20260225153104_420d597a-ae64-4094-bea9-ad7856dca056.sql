
-- Allow public read access to meal credits (accessed via customer_id from feedback token)
CREATE POLICY "Anyone can view meal credits by customer_id"
  ON public.customer_meal_credits
  FOR SELECT
  USING (true);

-- Allow public read access to meal withdrawals
CREATE POLICY "Anyone can view meal withdrawals by customer_id"
  ON public.customer_meal_withdrawals
  FOR SELECT
  USING (true);
