import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
  }
  return env;
}

// Load from .env file in project root
const envPath = path.join(process.cwd(), '.env');
const envVars = loadEnvFile(envPath);

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL');
  console.error('Please make sure .env file exists with VITE_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n📝 To get your service role key:');
  console.error('1. Go to https://supabase.com/dashboard/project/' + supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]);
  console.error('2. Click Settings > API');
  console.error('3. Copy the "service_role" key');
  console.error('4. Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.error('5. Then run this script again\n');
  process.exit(1);
}

console.log('✓ Supabase URL:', supabaseUrl);
console.log('✓ Service key loaded\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const CITIES = ['أبها', 'خميس مشيط'];
const CATEGORIES = ['food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general'];
const CONTENT_TYPES = ['ريلز', 'قصص', 'منشورات', 'فيديوهات طويلة'];
const AVG_VIEWS = ['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomCity(): string {
  return getRandomElement(CITIES);
}

function isPaid(): boolean {
  return Math.random() < 0.7; // 70% paid
}

function getRandomFollowersCount(): number {
  const ranges = [
    { min: 1000, max: 5000 },
    { min: 5000, max: 10000 },
    { min: 10000, max: 50000 },
    { min: 50000, max: 100000 },
    { min: 100000, max: 500000 },
  ];
  const range = getRandomElement(ranges);
  return getRandomNumber(range.min, range.max);
}

function getRandomEngagementRate(): number {
  return parseFloat((Math.random() * 8 + 2).toFixed(2)); // Between 2% and 10%
}

async function createFakeInfluencer(index: number) {
  const email = `fake-influencer-${index}@test.com`;
  const password = 'Test123456!';
  const displayName = `سعد خالد - مزيف${index}`;
  const city = getRandomCity();
  const category = getRandomElement(CATEGORIES);
  const contentType = getRandomElement(CONTENT_TYPES);
  const avgViews = getRandomElement(AVG_VIEWS);
  const acceptPaid = isPaid();
  const acceptHospitality = !acceptPaid;
  const followersCount = getRandomFollowersCount();
  const engagementRate = getRandomEngagementRate();
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    let userId: string;
    
    if (userExists) {
      const existingUserData = existingUser?.users?.find(u => u.email === email);
      userId = existingUserData!.id;
      console.log(`⚠️  User ${index} already exists, updating profile...`);
    } else {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
        }
      });

      if (authError) {
        console.error(`Error creating auth user ${index}:`, authError.message);
        return;
      }

      if (!authData.user) {
        console.error(`No user data returned for ${index}`);
        return;
      }

      userId = authData.user.id;
      console.log(`✓ Created auth user ${index}: ${email}`);

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: displayName,
          phone: `+966${getRandomNumber(500000000, 599999999)}`,
        });

      if (profileError) {
        console.error(`Error creating profile ${index}:`, profileError.message);
        return;
      }

      // 3. Add influencer role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'influencer',
        });

      if (roleError) {
        console.error(`Error creating role ${index}:`, roleError.message);
        return;
      }
    }

    // 4. Create or update influencer profile
    const { data: existingProfile } = await supabase
      .from('influencer_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const influencerData = {
      user_id: userId,
      display_name: displayName,
      instagram_handle: `@fake_tiktok_${index}`, // Placeholder since TikTok-only
      bio: `مؤثر تجريبي ${index} - محتوى إبداعي ومميز في ${city}. متخصص في ${contentType}`,
      cities: [city],
      primary_platforms: ['TikTok'],
      tiktok_url: `https://tiktok.com/@fake_user_${index}`,
      snapchat_username: null,
      category: category,
      content_type: contentType,
      avg_views_instagram: null,
      avg_views_tiktok: avgViews,
      avg_views_snapchat: null,
      accept_hospitality: acceptHospitality,
      accept_paid: acceptPaid,
      min_price: acceptPaid ? getRandomNumber(500, 2000) : null,
      max_price: acceptPaid ? getRandomNumber(3000, 10000) : null,
      followers_count: followersCount,
      engagement_rate: engagementRate,
    };

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('influencer_profiles')
        .update(influencerData)
        .eq('user_id', userId);

      if (updateError) {
        console.error(`Error updating influencer profile ${index}:`, updateError.message);
        return;
      }
      console.log(`✅ Updated influencer ${index}: ${displayName} (${city}, ${acceptPaid ? 'Paid' : 'Hospitality'}, ${followersCount.toLocaleString()} followers)`);
    } else {
      // Insert new profile
      const { error: influencerError } = await supabase
        .from('influencer_profiles')
        .insert(influencerData);

      if (influencerError) {
        console.error(`Error creating influencer profile ${index}:`, influencerError.message);
        return;
      }
      console.log(`✅ Created influencer ${index}: ${displayName} (${city}, ${acceptPaid ? 'Paid' : 'Hospitality'}, ${followersCount.toLocaleString()} followers)`);
    }
  } catch (error: any) {
    console.error(`Error creating influencer ${index}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting to create/update 50 fake influencer accounts...\n');
  console.log('📋 Specifications:');
  console.log('   - Names: سعد خالد - مزيف1 to مزيف50');
  console.log('   - Cities: أبها or خميس مشيط (random)');
  console.log('   - Platform: TikTok only');
  console.log('   - Collaboration: 70% paid, 30% hospitality\n');

  for (let i = 1; i <= 50; i++) {
    await createFakeInfluencer(i);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n✨ Finished creating/updating fake influencer accounts!');
  console.log('\n🔐 Login Credentials:');
  console.log('   Email: fake-influencer-{1-50}@test.com');
  console.log('   Password: Test123456!');
  console.log('\n✅ All profiles are now complete with:');
  console.log('   ✓ TikTok as primary platform');
  console.log('   ✓ Random city (أبها or خميس مشيط)');
  console.log('   ✓ Complete bio and profile info');
  console.log('   ✓ Random follower counts and engagement rates');
  console.log('   ✓ Collaboration preferences (70% paid)');
}

main().catch(console.error);

