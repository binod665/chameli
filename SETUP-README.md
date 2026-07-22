# chameli.com.np — नोट एप सेटअप गर्ने तरिका

## १. Supabase मा टेबल बनाउनुहोस्

Supabase Dashboard → **SQL Editor** मा गएर तलको SQL पेस्ट गरी Run गर्नुहोस्:

```sql
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text default '',
  content text default '',
  color text default 'yellow',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notes enable row level security;

create policy "आफ्नो नोट मात्र हेर्ने/लेख्ने"
on notes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

यसले प्रत्येक प्रयोगकर्ताले आफ्नो नोट मात्र देख्ने/सम्पादन गर्ने सुनिश्चित गर्छ (Row Level Security)।

## २. Project URL र anon key थप्नुहोस्

Supabase Dashboard → **Project Settings → API** मा गएर:
- **Project URL**
- **anon public** key

यी दुई कपी गरेर `config.js` फाइलमा राख्नुहोस्:

```js
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

## ३. Email login सक्षम छ भनी जाँच्नुहोस्

Supabase Dashboard → **Authentication → Providers** मा **Email** पहिल्यै सक्षम (enabled) हुन्छ। थप सेटिङ चाहिँदैन।

> नोट: पहिलो पटक अकाउन्ट बनाउँदा Supabase ले पुष्टि (confirmation) इमेल पठाउन सक्छ। यदि तपाईं टेस्ट गर्दै हुनुहुन्छ भने, Authentication → Providers → Email बाट "Confirm email" अस्थायी रूपमा निष्क्रिय (disable) गर्न सक्नुहुन्छ।

## ४. GitHub मा अपलोड गर्नुहोस्

यी ४ फाइलहरू आफ्नो GitHub repo (जुन chameli.com.np सँग जोडिएको छ) मा राख्नुहोस्:
- `index.html`
- `style.css`
- `app.js`
- `config.js` (आफ्नो URL/key भरेपछि)

## एपले के गर्छ

- **लगइन/साइनअप**: इमेल-पासवर्डबाट, वा "बिना लगइन" (guest, यो यन्त्रमा मात्र, ब्राउजरको localStorage मा)
- **नोट लेख्ने**: `+` बटनबाट नयाँ नोट, ५ वटा रङमध्ये छान्न मिल्ने
- **स्वतः सुरक्षित (autosave)**: टाइप गरेको ७०० मिलिसेकेन्डपछि आफै Supabase मा सेभ हुन्छ
- **खोज्ने**: शीर्षक/सामग्री अनुसार तुरुन्तै फिल्टर
- **मेटाउने**: सम्पादन मोडलबाट कुनै पनि नोट मेटाउन मिल्छ
- भोलि/अर्को दिन उही इमेलले लगइन गर्दा तपाईंका सबै नोट फिर्ता देखिन्छन्, किनभने डेटा Supabase (PostgreSQL) मा प्रत्येक प्रयोगकर्तासँग जोडिएर बस्छ।
