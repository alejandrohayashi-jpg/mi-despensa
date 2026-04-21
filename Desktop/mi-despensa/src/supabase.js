import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lujybkdfcchdjpukfbnb.supabase.co';
const supabaseKey = 'sb_publishable_lBtJi0L8S0c4hW3qaSYx4Q_x0aT-Cx2';

export const supabase = createClient(supabaseUrl, supabaseKey);