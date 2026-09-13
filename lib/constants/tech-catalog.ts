/**
 * @fileoverview Catálogo curado de tecnologías para el módulo Stack.
 * Iconos vía Simple Icons (iconSlug + hex).
 */

import type { StackItem, StackLayerId, TechCatalogEntry } from '@/lib/types/stack';

function entry(
  id: string,
  name: string,
  layer: StackLayerId,
  iconSlug: string,
  hex: string,
  opts?: Partial<Omit<TechCatalogEntry, 'id' | 'name' | 'layer' | 'iconSlug' | 'hex'>>
): TechCatalogEntry {
  return {
    id,
    name,
    layer,
    iconSlug,
    hex,
    aliases: opts?.aliases ?? [],
    implies: opts?.implies,
    conflicts: opts?.conflicts,
    tags: opts?.tags,
    primaryEligible: opts?.primaryEligible,
  };
}

/** ~120 tecnologías curadas por capa */
export const TECH_CATALOG: TechCatalogEntry[] = [
  // Frontend frameworks
  entry('react', 'React', 'frontend', 'react', '61DAFB', {
    aliases: ['reactjs'],
    tags: ['spa', 'web'],
    primaryEligible: true,
  }),
  entry('nextjs', 'Next.js', 'frontend', 'nextdotjs', '000000', {
    aliases: ['next', 'next.js'],
    implies: ['react', 'typescript'],
    tags: ['ssr', 'fullstack', 'web'],
    primaryEligible: true,
  }),
  entry('vue', 'Vue.js', 'frontend', 'vuedotjs', '4FC08D', {
    aliases: ['vuejs', 'vue 3'],
    tags: ['spa', 'web'],
    primaryEligible: true,
  }),
  entry('nuxt', 'Nuxt', 'frontend', 'nuxt', '00DC82', {
    implies: ['vue'],
    tags: ['ssr', 'web'],
    primaryEligible: true,
  }),
  entry('angular', 'Angular', 'frontend', 'angular', 'DD0031', {
    tags: ['spa', 'enterprise', 'web'],
    primaryEligible: true,
  }),
  entry('svelte', 'Svelte', 'frontend', 'svelte', 'FF3E00', {
    tags: ['spa', 'web'],
    primaryEligible: true,
  }),
  entry('sveltekit', 'SvelteKit', 'frontend', 'svelte', 'FF3E00', {
    implies: ['svelte'],
    tags: ['ssr', 'web'],
    primaryEligible: true,
  }),
  entry('remix', 'Remix', 'frontend', 'remix', '000000', {
    implies: ['react'],
    tags: ['ssr', 'web'],
    primaryEligible: true,
  }),
  entry('astro', 'Astro', 'frontend', 'astro', 'BC52EE', {
    tags: ['static', 'web'],
    primaryEligible: true,
  }),
  entry('solidjs', 'SolidJS', 'frontend', 'solid', '2C4F7C', {
    tags: ['spa', 'web'],
    primaryEligible: true,
  }),
  entry('qwik', 'Qwik', 'frontend', 'qwik', '18B6F6', {
    tags: ['spa', 'web'],
    primaryEligible: true,
  }),
  entry('htmx', 'htmx', 'frontend', 'htmx', '3366CC', {
    tags: ['web', 'minimal'],
    primaryEligible: true,
  }),

  // Frontend libs / languages
  entry('typescript', 'TypeScript', 'frontend', 'typescript', '3178C6', {
    aliases: ['ts'],
    tags: ['language'],
  }),
  entry('javascript', 'JavaScript', 'frontend', 'javascript', 'F7DF1E', {
    aliases: ['js', 'es6'],
    tags: ['language'],
  }),
  entry('redux', 'Redux', 'frontend', 'redux', '764ABC', { implies: ['react'] }),
  entry('zustand', 'Zustand', 'frontend', 'react', '61DAFB', { implies: ['react'] }),
  entry('tanstack-query', 'TanStack Query', 'frontend', 'reactquery', 'FF4154', {
    aliases: ['react query'],
  }),
  entry('vite', 'Vite', 'frontend', 'vite', '646CFF', { tags: ['bundler'] }),

  // Styling
  entry('tailwindcss', 'Tailwind CSS', 'styling', 'tailwindcss', '06B6D4', {
    aliases: ['tailwind'],
  }),
  entry('css-modules', 'CSS Modules', 'styling', 'css3', '1572B6'),
  entry('sass', 'Sass', 'styling', 'sass', 'CC6699'),
  entry('styled-components', 'styled-components', 'styling', 'styledcomponents', 'DB7093', {
    implies: ['react'],
  }),
  entry('material-ui', 'Material UI', 'styling', 'mui', '007FFF', { implies: ['react'] }),
  entry('chakra-ui', 'Chakra UI', 'styling', 'chakraui', '319795', { implies: ['react'] }),
  entry('shadcn-ui', 'shadcn/ui', 'styling', 'shadcnui', '000000', {
    implies: ['react', 'tailwindcss'],
  }),
  entry('bootstrap', 'Bootstrap', 'styling', 'bootstrap', '7952B3'),

  // Backend runtimes / frameworks
  entry('nodejs', 'Node.js', 'backend', 'nodedotjs', '339933', {
    aliases: ['node'],
    tags: ['runtime', 'javascript'],
    primaryEligible: true,
  }),
  entry('express', 'Express', 'backend', 'express', '000000', {
    implies: ['nodejs'],
    primaryEligible: true,
  }),
  entry('nestjs', 'NestJS', 'backend', 'nestjs', 'E0234E', {
    implies: ['nodejs', 'typescript'],
    primaryEligible: true,
  }),
  entry('fastify', 'Fastify', 'backend', 'fastify', '000000', {
    implies: ['nodejs'],
    primaryEligible: true,
  }),
  entry('hono', 'Hono', 'backend', 'hono', 'E36002', { tags: ['edge'] }),
  entry('deno', 'Deno', 'backend', 'deno', '000000', {
    aliases: ['deno runtime'],
    tags: ['edge', 'runtime'],
  }),
  entry('supabase-edge-functions', 'Supabase Edge Functions', 'backend', 'supabase', '3FCF8E', {
    aliases: ['supabase edge functions', 'edge functions'],
    implies: ['supabase-baas', 'deno'],
    tags: ['edge', 'serverless'],
  }),
  entry('python', 'Python', 'backend', 'python', '3776AB', {
    tags: ['language'],
    primaryEligible: true,
  }),
  entry('django', 'Django', 'backend', 'django', '092E20', {
    implies: ['python'],
    primaryEligible: true,
  }),
  entry('fastapi', 'FastAPI', 'backend', 'fastapi', '009688', {
    implies: ['python'],
    primaryEligible: true,
  }),
  entry('flask', 'Flask', 'backend', 'flask', '000000', {
    implies: ['python'],
    primaryEligible: true,
  }),
  entry('go', 'Go', 'backend', 'go', '00ADD8', {
    aliases: ['golang'],
    primaryEligible: true,
  }),
  entry('gin', 'Gin', 'backend', 'go', '00ADD8', { implies: ['go'] }),
  entry('rust', 'Rust', 'backend', 'rust', '000000', { primaryEligible: true }),
  entry('actix', 'Actix Web', 'backend', 'rust', '000000', { implies: ['rust'] }),
  entry('java', 'Java', 'backend', 'openjdk', '437291', { primaryEligible: true }),
  entry('spring-boot', 'Spring Boot', 'backend', 'springboot', '6DB33F', {
    implies: ['java'],
    primaryEligible: true,
  }),
  entry('kotlin', 'Kotlin', 'backend', 'kotlin', '7F52FF', { primaryEligible: true }),
  entry('csharp', 'C# / .NET', 'backend', 'dotnet', '512BD4', {
    aliases: ['dotnet', '.net'],
    primaryEligible: true,
  }),
  entry('aspnet-core', 'ASP.NET Core', 'backend', 'dotnet', '512BD4', {
    implies: ['csharp'],
    primaryEligible: true,
  }),
  entry('php', 'PHP', 'backend', 'php', '777BB4', { primaryEligible: true }),
  entry('laravel', 'Laravel', 'backend', 'laravel', 'FF2D20', {
    implies: ['php'],
    primaryEligible: true,
  }),
  entry('ruby', 'Ruby', 'backend', 'ruby', 'CC342D', { primaryEligible: true }),
  entry('rails', 'Ruby on Rails', 'backend', 'rubyonrails', 'CC0000', {
    aliases: ['rails'],
    implies: ['ruby'],
    primaryEligible: true,
  }),
  entry('elixir', 'Elixir', 'backend', 'elixir', '4B275F', { primaryEligible: true }),
  entry('phoenix', 'Phoenix', 'backend', 'phoenixframework', 'FD4F00', {
    implies: ['elixir'],
    primaryEligible: true,
  }),

  // Backend as a Service (BaaS)
  entry('supabase-baas', 'Supabase', 'backend', 'supabase', '3FCF8E', {
    aliases: ['supabase baas', 'supabase backend'],
    tags: ['baas', 'serverless', 'postgres'],
    implies: ['supabase-db', 'supabase-auth'],
    primaryEligible: true,
  }),
  entry('firebase-baas', 'Firebase', 'backend', 'firebase', 'DD2C00', {
    aliases: ['firebase baas', 'firebase backend'],
    tags: ['baas', 'serverless', 'google'],
    implies: ['firestore', 'firebase-auth'],
    primaryEligible: true,
  }),
  entry('appwrite', 'Appwrite', 'backend', 'appwrite', 'F02E65', {
    aliases: ['app write'],
    tags: ['baas', 'open-source', 'self-hosted'],
    primaryEligible: true,
  }),
  entry('pocketbase', 'PocketBase', 'backend', 'pocketbase', 'B8DBE4', {
    tags: ['baas', 'open-source', 'sqlite'],
    primaryEligible: true,
  }),
  entry('convex', 'Convex', 'backend', 'convex', 'FF5722', {
    tags: ['baas', 'serverless', 'realtime'],
    primaryEligible: true,
  }),
  entry('amplify', 'AWS Amplify', 'backend', 'awsamplify', 'FF9900', {
    aliases: ['amplify'],
    tags: ['baas', 'aws', 'serverless'],
    implies: ['aws'],
    primaryEligible: true,
  }),
  entry('nhost', 'Nhost', 'backend', 'nhost', '0052CC', {
    tags: ['baas', 'graphql', 'postgres'],
    implies: ['postgresql'],
    primaryEligible: true,
  }),
  entry('parse', 'Parse Platform', 'backend', 'parseplatform', '0097D6', {
    aliases: ['parse server', 'back4app'],
    tags: ['baas', 'open-source'],
    primaryEligible: true,
  }),

  // Database
  entry('postgresql', 'PostgreSQL', 'database', 'postgresql', '4169E1', {
    aliases: ['postgres', 'pg'],
    primaryEligible: true,
  }),
  entry('mysql', 'MySQL', 'database', 'mysql', '4479A1', { primaryEligible: true }),
  entry('mongodb', 'MongoDB', 'database', 'mongodb', '47A248', {
    aliases: ['mongo'],
    primaryEligible: true,
  }),
  entry('sqlite', 'SQLite', 'database', 'sqlite', '003B57', { primaryEligible: true }),
  entry('redis', 'Redis', 'database', 'redis', 'FF4438', {
    tags: ['cache', 'kv'],
    primaryEligible: true,
  }),
  entry('firestore', 'Cloud Firestore', 'database', 'firebase', 'DD2C00', {
    aliases: ['firestore'],
    implies: ['firebase'],
    primaryEligible: true,
  }),
  entry('supabase-db', 'Supabase Postgres', 'database', 'supabase', '3FCF8E', {
    implies: ['postgresql', 'supabase'],
    primaryEligible: true,
  }),
  entry('planetscale', 'PlanetScale', 'database', 'planetscale', '000000', {
    implies: ['mysql'],
    primaryEligible: true,
  }),
  entry('dynamodb', 'Amazon DynamoDB', 'database', 'amazondynamodb', '4053D6', {
    implies: ['aws'],
    primaryEligible: true,
  }),
  entry('cassandra', 'Apache Cassandra', 'database', 'apachecassandra', '1287B1', {
    primaryEligible: true,
  }),
  entry('neo4j', 'Neo4j', 'database', 'neo4j', '4581C3', {
    tags: ['graph'],
    primaryEligible: true,
  }),
  entry('clickhouse', 'ClickHouse', 'database', 'clickhouse', 'FFCC01', {
    tags: ['analytics'],
    primaryEligible: true,
  }),

  // ORM
  entry('prisma', 'Prisma', 'orm', 'prisma', '2D3748', { implies: ['typescript'] }),
  entry('drizzle', 'Drizzle ORM', 'orm', 'drizzle', 'C5F74F'),
  entry('typeorm', 'TypeORM', 'orm', 'typeorm', 'FE0803', { implies: ['typescript'] }),
  entry('sequelize', 'Sequelize', 'orm', 'sequelize', '52B0E7'),
  entry('sqlalchemy', 'SQLAlchemy', 'orm', 'sqlalchemy', 'D71F00', { implies: ['python'] }),
  entry('mongoose', 'Mongoose', 'orm', 'mongoose', '880000', { implies: ['mongodb'] }),

  // Auth
  entry('firebase-auth', 'Firebase Auth', 'auth', 'firebase', 'DD2C00', { implies: ['firebase'] }),
  entry('auth0', 'Auth0', 'auth', 'auth0', 'EB5424'),
  entry('clerk', 'Clerk', 'auth', 'clerk', '6C47FF'),
  entry('nextauth', 'NextAuth.js', 'auth', 'nextdotjs', '000000', { implies: ['nextjs'] }),
  entry('passport', 'Passport.js', 'auth', 'passport', '34E27A', { implies: ['nodejs'] }),
  entry('keycloak', 'Keycloak', 'auth', 'keycloak', '4D4D4D'),
  entry('cognito', 'Amazon Cognito', 'auth', 'amazoncognito', 'FF9900', { implies: ['aws'] }),
  entry('supabase-auth', 'Supabase Auth', 'auth', 'supabase', '3FCF8E', {
    aliases: ['supabase auth'],
    implies: ['supabase'],
  }),

  // Hosting / infra
  entry('vercel', 'Vercel', 'hosting', 'vercel', '000000', { tags: ['serverless'] }),
  entry('netlify', 'Netlify', 'hosting', 'netlify', '00C7B7'),
  entry('aws', 'Amazon Web Services', 'hosting', 'amazonwebservices', '232F3E', {
    aliases: ['amazon aws'],
  }),
  entry('gcp', 'Google Cloud', 'hosting', 'googlecloud', '4285F4', {
    aliases: ['google cloud'],
  }),
  entry('azure', 'Microsoft Azure', 'hosting', 'microsoftazure', '0078D4'),
  entry('firebase', 'Firebase', 'hosting', 'firebase', 'DD2C00', { tags: ['baas'] }),
  entry('supabase', 'Supabase', 'hosting', 'supabase', '3FCF8E', { tags: ['baas'] }),
  entry('cloudflare', 'Cloudflare', 'hosting', 'cloudflare', 'F38020', { tags: ['edge', 'cdn'] }),
  entry('railway', 'Railway', 'hosting', 'railway', '0B0D0E'),
  entry('render', 'Render', 'hosting', 'render', '000000'),
  entry('fly-io', 'Fly.io', 'hosting', 'flydotio', '7B3BE4'),
  entry('digitalocean', 'DigitalOcean', 'hosting', 'digitalocean', '0080FF'),
  entry('docker', 'Docker', 'hosting', 'docker', '2496ED'),
  entry('kubernetes', 'Kubernetes', 'hosting', 'kubernetes', '326CE5', {
    aliases: ['k8s'],
    implies: ['docker'],
  }),

  // Realtime
  entry('socket-io', 'Socket.IO', 'realtime', 'socketdotio', '010101', { implies: ['nodejs'] }),
  entry('websocket', 'WebSockets', 'realtime', 'websocket', '010101'),
  entry('pusher', 'Pusher', 'realtime', 'pusher', '300D4F'),
  entry('ably', 'Ably', 'realtime', 'ably', 'FF5416'),
  entry('firebase-rtdb', 'Firebase Realtime DB', 'realtime', 'firebase', 'DD2C00', {
    implies: ['firebase'],
  }),
  entry('supabase-realtime', 'Supabase Realtime', 'realtime', 'supabase', '3FCF8E', {
    aliases: ['supabase realtime'],
    implies: ['supabase'],
  }),

  // Storage
  entry('s3', 'Amazon S3', 'storage', 'amazons3', '569A31', { implies: ['aws'] }),
  entry('cloudinary', 'Cloudinary', 'storage', 'cloudinary', '3448C5'),
  entry('firebase-storage', 'Firebase Storage', 'storage', 'firebase', 'DD2C00', {
    implies: ['firebase'],
  }),
  entry('supabase-storage', 'Supabase Storage', 'storage', 'supabase', '3FCF8E', {
    implies: ['supabase'],
  }),

  // Testing
  entry('jest', 'Jest', 'testing', 'jest', 'C21325'),
  entry('vitest', 'Vitest', 'testing', 'vitest', '6E9F18'),
  entry('playwright', 'Playwright', 'testing', 'playwright', '2EAD33'),
  entry('cypress', 'Cypress', 'testing', 'cypress', '69D3A7'),
  entry('pytest', 'pytest', 'testing', 'pytest', '0A9EDC', { implies: ['python'] }),
  entry('testing-library', 'Testing Library', 'testing', 'testinglibrary', 'E33332'),

  // Payments
  entry('stripe', 'Stripe', 'payments', 'stripe', '635BFF'),
  entry('paypal', 'PayPal', 'payments', 'paypal', '003087'),
  entry('mercadopago', 'Mercado Pago', 'payments', 'mercadopago', '00B1EA'),

  // Mobile
  entry('react-native', 'React Native', 'mobile', 'react', '61DAFB', {
    implies: ['react'],
    conflicts: ['flutter', 'swift', 'kotlin-mobile'],
    primaryEligible: true,
  }),
  entry('expo', 'Expo', 'mobile', 'expo', '000020', { implies: ['react-native'] }),
  entry('flutter', 'Flutter', 'mobile', 'flutter', '02569B', {
    conflicts: ['react-native', 'swift', 'kotlin-mobile'],
    primaryEligible: true,
  }),
  entry('swift', 'Swift / iOS nativo', 'mobile', 'swift', 'F05138', {
    conflicts: ['react-native', 'flutter', 'kotlin-mobile'],
    primaryEligible: true,
  }),
  entry('kotlin-mobile', 'Kotlin / Android nativo', 'mobile', 'kotlin', '7F52FF', {
    conflicts: ['react-native', 'flutter', 'swift'],
    primaryEligible: true,
  }),

  // CMS
  entry('contentful', 'Contentful', 'cms', 'contentful', '2478CC'),
  entry('sanity', 'Sanity', 'cms', 'sanity', 'F03E2F'),
  entry('strapi', 'Strapi', 'cms', 'strapi', '4945FF', { implies: ['nodejs'] }),
  entry('wordpress', 'WordPress', 'cms', 'wordpress', '21759B'),

  // Messaging
  entry('sendgrid', 'SendGrid', 'messaging', 'sendgrid', '51A9E3'),
  entry('resend', 'Resend', 'messaging', 'resend', '000000'),
  entry('twilio', 'Twilio', 'messaging', 'twilio', 'F22F46'),
  entry('firebase-fcm', 'Firebase Cloud Messaging', 'messaging', 'firebase', 'DD2C00', {
    implies: ['firebase'],
  }),

  // Monitoring
  entry('sentry', 'Sentry', 'monitoring', 'sentry', '362D59'),
  entry('datadog', 'Datadog', 'monitoring', 'datadog', '632CA6'),
  entry('grafana', 'Grafana', 'monitoring', 'grafana', 'F46800'),
  entry('prometheus', 'Prometheus', 'monitoring', 'prometheus', 'E6522C'),

  // DevOps
  entry('github-actions', 'GitHub Actions', 'devops', 'githubactions', '2088FF'),
  entry('gitlab-ci', 'GitLab CI', 'devops', 'gitlab', 'FC6D26'),
  entry('terraform', 'Terraform', 'devops', 'terraform', '844FBA'),
  entry('pulumi', 'Pulumi', 'devops', 'pulumi', '8A3391'),
];

// Fix swift entry - I made an error with duplicate id in entry call
// Let me fix - the swift entry had wrong syntax. I'll fix in compatibility file.

const catalogById = new Map<string, TechCatalogEntry>();
const catalogByLayer = new Map<StackLayerId, TechCatalogEntry[]>();

for (const tech of TECH_CATALOG) {
  catalogById.set(tech.id, tech);
  const list = catalogByLayer.get(tech.layer) ?? [];
  list.push(tech);
  catalogByLayer.set(tech.layer, list);
}

export function getTechById(id: string): TechCatalogEntry | undefined {
  return catalogById.get(id) ?? catalogById.get(id.toLowerCase());
}

/** Resuelve un ítem del stack al catálogo (catalogId, nombre o alias). */
export function resolveTechFromStackItem(item: StackItem): TechCatalogEntry | undefined {
  if (item.catalogId) {
    const byId = getTechById(item.catalogId);
    if (byId) return byId;
  }

  const label = item.customName?.trim() || item.catalogId?.trim();
  if (!label) return undefined;

  return resolveTechByLabel(label);
}

/** Resuelve un nombre suelto (id, nombre o alias) contra el catálogo. */
export function resolveTechByLabel(label: string): TechCatalogEntry | undefined {
  const trimmed = label.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  return TECH_CATALOG.find(
    (tech) =>
      tech.id === lower ||
      tech.name.toLowerCase() === lower ||
      tech.aliases.some((alias) => alias.toLowerCase() === lower)
  );
}

/** Separa etiquetas compuestas del LLM ("React + TypeScript", "JWT y bcrypt"). */
export function splitCompoundTechLabel(label: string): string[] {
  return label
    .split(/\s*(?:\+|,|\/|&|\band\b|\by\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Resuelve un fragmento de texto a entradas del catálogo.
 * Maneja paréntesis, separadores y coincidencias embebidas ("Supabase Auth (JWT + bcrypt)").
 */
export function resolveTechPartsFromLabel(
  label: string,
  preferredLayer?: StackLayerId
): TechCatalogEntry[] {
  const trimmed = label.trim();
  if (!trimmed) return [];

  const found = new Map<string, TechCatalogEntry>();
  const add = (tech: TechCatalogEntry) => {
    if (!found.has(tech.id)) found.set(tech.id, tech);
  };

  const direct = resolveTechByLabel(trimmed);
  if (direct) return [direct];

  const parenMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    for (const tech of findCatalogMatchesInLabel(parenMatch[1].trim(), preferredLayer)) {
      add(tech);
    }
    for (const part of splitCompoundTechLabel(parenMatch[2].trim())) {
      for (const tech of resolveTechPartsFromLabel(part, preferredLayer)) {
        add(tech);
      }
    }
    if (found.size > 0) return [...found.values()];
  }

  for (const tech of findCatalogMatchesInLabel(trimmed, preferredLayer)) {
    add(tech);
  }
  if (found.size > 0) return [...found.values()];

  const segments = splitCompoundTechLabel(trimmed);
  if (segments.length > 1) {
    for (const segment of segments) {
      for (const tech of resolveTechPartsFromLabel(segment, preferredLayer)) {
        add(tech);
      }
    }
    if (found.size > 0) return [...found.values()];
  }

  return [];
}

function isCatalogMatchBoundary(char: string | undefined): boolean {
  if (!char) return true;
  return /[\s,/+&\-():]/.test(char);
}

/** Busca tecnologías del catálogo mencionadas dentro de un texto compuesto del LLM. */
export function findCatalogMatchesInLabel(
  label: string,
  preferredLayer?: StackLayerId
): TechCatalogEntry[] {
  const lower = label.toLowerCase();
  const found: TechCatalogEntry[] = [];
  const usedRanges: Array<[number, number]> = [];

  const candidates = TECH_CATALOG.flatMap((tech) =>
    [tech.name, ...tech.aliases].map((matchStr) => ({
      tech,
      matchLower: matchStr.toLowerCase(),
    }))
  )
    .filter((candidate) => candidate.matchLower.length >= 3)
    .sort((a, b) => {
      if (b.matchLower.length !== a.matchLower.length) {
        return b.matchLower.length - a.matchLower.length;
      }
      if (preferredLayer) {
        const aPref = a.tech.layer === preferredLayer ? 0 : 1;
        const bPref = b.tech.layer === preferredLayer ? 0 : 1;
        if (aPref !== bPref) return aPref - bPref;
      }
      return 0;
    });

  for (const { tech, matchLower } of candidates) {
    if (found.some((entry) => entry.id === tech.id)) continue;

    let idx = lower.indexOf(matchLower);
    while (idx !== -1) {
      const end = idx + matchLower.length;
      const before = idx > 0 ? lower[idx - 1] : undefined;
      const after = end < lower.length ? lower[end] : undefined;
      const overlaps = usedRanges.some(([start, stop]) => idx < stop && end > start);

      if (
        isCatalogMatchBoundary(before) &&
        isCatalogMatchBoundary(after) &&
        !overlaps
      ) {
        found.push(tech);
        usedRanges.push([idx, end]);
        break;
      }

      idx = lower.indexOf(matchLower, idx + 1);
    }
  }

  return found;
}

export function getTechCatalogByLayer(layer: StackLayerId): TechCatalogEntry[] {
  const items = catalogByLayer.get(layer) ?? [];
  if (layer !== 'backend') return items;

  return [...items].sort((a, b) => {
    const aBaas = a.tags?.includes('baas') ? 0 : 1;
    const bBaas = b.tags?.includes('baas') ? 0 : 1;
    if (aBaas !== bBaas) return aBaas - bBaas;
    return a.name.localeCompare(b.name, 'es');
  });
}

export function searchTechCatalog(query: string, layer?: StackLayerId): TechCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return layer ? getTechCatalogByLayer(layer) : TECH_CATALOG;
  }
  const pool = layer ? getTechCatalogByLayer(layer) : TECH_CATALOG;
  return pool.filter((tech) => {
    const haystack = [tech.name, tech.id, ...tech.aliases, ...(tech.tags ?? [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getCatalogIdsForPrompt(): string {
  return TECH_CATALOG.map(
    (t) => `${t.id} (${t.name}, capa: ${t.layer}${t.primaryEligible ? ', primario' : ''})`
  ).join('\n');
}

/** Slug Simple Icons desde nombre custom */
export function guessIconSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.js$/i, 'dotjs')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^next$/, 'nextdotjs')
    .replace(/^node$/, 'nodedotjs');
}
