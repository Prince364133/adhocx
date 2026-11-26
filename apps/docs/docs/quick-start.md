---
id: quick-start
title: Quick Start
description: Set up the AdhocX workspace, local services, and applications using verified repository commands.
status: source-mapped
last_reviewed: "2026-11-24"
---

# Quick Start

This is the practical setup path for a fresh AdhocX checkout. AdhocX is a pnpm workspace containing a NestJS API, three Next.js web applications, two Flutter applications, an Astro marketing site, and this Docusaurus site.

The commands below are based on the workspace manifests and application launch scripts. The repository has several environment files; **do not copy their values into documentation, chat, source control, or another machine**. In particular, do not copy `.env.example` or `.env.production.example` blindly. Create a minimal local-only `.env` if one is not already present, and keep it ignored by Git.

## 1. Prerequisites

| Software / tool | Required version | Why needed | Required for |
|---|---|---|---|
| Node.js | Node 20 is the CI baseline; use Node 20 LTS for a matching setup | Runs the JavaScript/TypeScript workspace, API, web apps, marketing site, and docs | All workspace apps except native Flutter tooling |
| pnpm | `10.17.1` (pinned by the root `package.json`) | Installs and runs the shared workspace | All Node.js workspace apps |
| Git | A current release; the repository does not pin a minimum | Clones the source and is used by some workspace scripts | All apps |
| Docker Desktop with Compose v2 | Current supported release; the repo does not pin a minimum | Starts local PostgreSQL/PostGIS and Redis without separate database installs | API and local data services |
| PostgreSQL with PostGIS | PostgreSQL 16 / PostGIS 3.4, from the checked-in Compose image | Stores API data and provides the geospatial database extension | API; started through Docker Compose |
| Redis | 7.2, from the checked-in Compose image | API cache and pub/sub infrastructure | API; started through Docker Compose |
| Flutter | Stable channel; project Dart constraint is `>=3.3.0 <4.0.0` | Builds and runs the Driver/Vendor and Employee Flutter clients | Mobile and Employee App |
| Java JDK | 17 | Required by the checked-in Android Gradle builds | Android versions of both Flutter apps |
| Android Studio + Android SDK | Android SDK and configured emulator/device; Mobile currently compiles against SDK 36 | Android build tools, emulator, and platform SDK | Android builds of Mobile and Employee App; not needed for web |

Install links: [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/installation), [Git](https://git-scm.com/downloads), [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Flutter](https://docs.flutter.dev/get-started/install), [JDK 17](https://adoptium.net/temurin/releases/?version=17), and [Android Studio](https://developer.android.com/studio).

Check the installed tools from a terminal:

```powershell
node --version
pnpm --version
git --version
docker --version
docker compose version
flutter --version
dart --version
java -version
```

Flutter and Java checks are only needed for Flutter or Android work. iOS builds require macOS and Xcode; they cannot be built on Windows.

On Windows PowerShell, if script execution policy blocks `pnpm.ps1` or `corepack.ps1`, use the corresponding command shims `pnpm.cmd` and `corepack.cmd` instead. Do not weaken the machine-wide execution policy just to run workspace commands.

## 2. Clone and install the workspace

The configured repository is `Prince364133/adhocx`. From a parent directory where you want the checkout:

```powershell
git clone https://github.com/Prince364133/adhocx.git
Set-Location adhocx
```

The top-level layout is `apps/` for the deployable applications and `packages/` for shared workspace packages. Install dependencies once from the repository root, not separately in each Node.js app:

```powershell
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
```

`pnpm install --frozen-lockfile` installs the versions recorded in `pnpm-lock.yaml` and fails rather than silently changing the lockfile. If Corepack is unavailable, install the pinned pnpm release using the official pnpm installation instructions, then rerun the `pnpm --version` check.

Prepare shared packages and generate the Prisma client before starting the API:

```powershell
pnpm run predev:all
```

This root script builds the shared contracts and domain-core packages and generates the API's Prisma client.

## 3. Configure local environment

### Local database and API settings

Compose reads the root `.env` file. The API also loads `.env.local` / `.env` from its working directory and from the repository root. Check whether a local `.env` already exists before creating one; never overwrite a developer's existing file. If starting from a fresh clone, create a root `.env` with local-only values similar to these, then replace the sample password and secret values with unique values for your machine:

```dotenv
NODE_ENV=development
PORT=7001
API_PREFIX=api/v1

POSTGRES_USER=adhocx_local
POSTGRES_PASSWORD=replace_with_a_local_only_password
POSTGRES_DB=adhocx_local
DB_PORT=5432
DATABASE_URL=postgresql://adhocx_local:replace_with_a_local_only_password@localhost:5432/adhocx_local?schema=public

REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=replace_with_a_unique_local_access_secret
JWT_REFRESH_SECRET=replace_with_a_unique_local_refresh_secret
```

Use the same URL-safe local password in `POSTGRES_PASSWORD` and `DATABASE_URL`. If it contains URL-reserved characters, percent-encode them in `DATABASE_URL`. These are examples only—not production-ready credentials. Never commit `.env` or use development secrets in production.

| Environment variable | Application | Purpose | Required / optional | Example |
|---|---|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Docker Compose PostgreSQL service | Creates the local database user and database when the data volume is initialized | Required for this local Compose setup | `adhocx_local`, a unique local password, `adhocx_local` |
| `DB_PORT` | Docker Compose / API | Host port for PostgreSQL; API defaults to `5432` | Optional; default `5432` | `5432` |
| `DATABASE_URL` | API / Prisma | PostgreSQL connection used by the API and Prisma commands | Required to connect to the local database | `postgresql://<user>:<password>@localhost:5432/<database>?schema=public` |
| `REDIS_PORT` | Docker Compose / API | Host port for Redis; API defaults to `6379` | Optional; default `6379` | `6379` |
| `REDIS_URL` | API | Redis connection used by API infrastructure | Required for the local API setup | `redis://localhost:6379` |
| `PORT`, `API_PREFIX` | API | API listen port and route prefix; defaults are `7001` and `api/v1` | Optional | `7001`, `api/v1` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | API | Local token-signing secrets; separate secrets are used for access and refresh tokens | Optional in development; required and must be strong in production | Replace with unique local-only values |
| `NEXT_PUBLIC_API_URL` | Admin, Ops, Corporate | Overrides the browser API base URL; normally local clients resolve the local API automatically | Optional | `http://localhost:7001/api/v1` |
| `API_URL` / `API_BASE_URL` | Flutter clients | Compile-time API base URL; launch scripts set a local URL for web and the Android-emulator host for Employee App | Needed when overriding a Flutter target's default | `http://10.0.2.2:7001/api/v1` for Android emulator |
| `API_URL`, `PUBLIC_API_URL` | Marketing | Optional API base used by the RSS integration | Optional | `http://localhost:7001/api/v1` |
| `API_DOCS_URL`, `DOCUSAURUS_URL` | Documentation site | Optional Swagger link and docs site origin overrides | Optional | `http://localhost:7001/docs`, `http://localhost:7007` |

The standard local setup needs only the repository-root `.env` described above. The API also supports app-local `apps/api/.env.local` and `apps/api/.env` overrides; these are optional, and keeping one consistent local source avoids conflicting connection values. No additional `.env` file is required by Admin, Ops, Corporate, Marketing, or the Flutter apps: Flutter launchers pass compile-time `API_URL` values, and the web clients use their local defaults. Docusaurus URL overrides are read from the process environment when supplied.

Third-party features such as payment, SMS/OTP delivery, email, maps, and object storage may need provider-specific credentials. They are not required just to start the local web apps and are catalogued in [Environment configuration](./platform/engineering/environment-configuration.md). Do not put production credentials in a local setup. No default application user or complete seed dataset is documented; do not assume there are test login credentials.

## 4. Start PostgreSQL and Redis

The root `docker-compose.yml` defines PostgreSQL with PostGIS and Redis. Start only those dependencies for local development:

```powershell
docker compose up -d postgres redis
docker compose ps
```

Wait until both containers show as running/healthy. PostgreSQL uses the configured local `POSTGRES_*` values and Redis listens on `6379`. Compose creates the database on first initialization; keep the volume for subsequent runs. If an existing volume was initialized with different credentials, update your local connection settings to match it rather than deleting the volume.

The Compose file also defines API and Admin containers with production-mode settings and insecure fallback values. **Do not use `docker compose up` for the whole stack as the local-development startup command.** Run the API and frontends with their development scripts below.

## 5. Prepare the database schema

After Docker reports PostgreSQL healthy and `DATABASE_URL` points to it, push the current Prisma schema to this disposable local database:

```powershell
pnpm --filter @adhocx/api exec prisma db push
```

This synchronizes the schema without applying the migration history. It is a local-development shortcut only: do not run it against staging or production. The API workspace also provides a migration verification script, but there is no general-purpose seed command in the root setup. A specialized distance-pricing seed script is not a substitute for complete application seed data.

## 6. Run each application

The Node.js dependencies are installed once at the workspace root. Flutter apps need their Dart dependencies fetched separately. Start each application in its own terminal from the repository root unless the command below explicitly changes directory.

| Application | Directory | Install command | Development command | Port / URL |
|---|---|---|---|---|
| API | `apps/api` | Root `pnpm install`, then `pnpm run predev:all` | `pnpm run dev:api` | `http://localhost:7001`; health: `/api/v1/health`; Swagger: `/docs` |
| Admin | `apps/admin` | Root `pnpm install` | `pnpm run dev:admin` | `http://localhost:7002` |
| Ops | `apps/ops` | Root `pnpm install` | `pnpm run dev:ops` | `http://localhost:7004` |
| Corporate | `apps/corporate` | Root `pnpm install` | `pnpm run dev:corporate` | `http://localhost:7006` |
| Mobile (Driver/Vendor) | `apps/mobile` | `pnpm --filter @adhocx/mobile exec flutter pub get` | `pnpm run dev:mobile` (Flutter web) | `http://localhost:7003` |
| Employee App | `apps/employee_app` | `pnpm --filter @adhocx/employee-app exec flutter pub get` | `pnpm run dev:employee` (Flutter web) | `http://localhost:7005` |
| Marketing | `apps/marketing` | Root `pnpm install` | `pnpm run dev:marketing` | `http://localhost:4321` |
| Documentation | `apps/docs` | Root `pnpm install` | `pnpm run dev:docs` | `http://localhost:7007` |

The API and Admin, Ops, and Corporate clients use the local API when running locally. Marketing is a separate Astro application; its API URL is only needed for API-backed RSS content. Docs is a separate Docusaurus application and links to the API's Swagger UI.

### Application-specific setup and validation

The root `pnpm install --frozen-lockfile` installs the JavaScript workspace once. For every application below, run commands from the repository root unless a command explicitly changes into the app directory. The success check is that its development server remains running and the URL in the table above loads.

#### API

The NestJS modular-monolith API authenticates and authorizes requests, applies business rules, and coordinates PostgreSQL, Redis, and integrations. Its code is in `apps/api`; local startup depends on healthy PostgreSQL/Redis, a local `DATABASE_URL` and `REDIS_URL`, and `pnpm run predev:all` to prepare workspace packages and Prisma.

```powershell
pnpm run dev:api
pnpm --filter @adhocx/api build
pnpm --filter @adhocx/api test
```

The development server should stay running on port `7001`. Verify it at `/api/v1/health`; Swagger is at `/docs`. The API package also defines `lint` and `typecheck` scripts. Optional provider integrations require their own local configuration; they are not prerequisites for the health endpoint.

#### Admin

The Admin Control Portal is the privileged platform staff interface for marketplace, tenant, compliance, finance, and support workflows. It is the Next.js app in `apps/admin` and calls the API; the API must be running for authenticated data workflows.

```powershell
pnpm run dev:admin
pnpm --filter @adhocx/admin build
pnpm --filter @adhocx/admin lint
pnpm --filter @adhocx/admin typecheck
```

Open port `7002`. No Admin `test` script is declared in its package manifest; use its available lint, typecheck, and build checks instead. `NEXT_PUBLIC_API_URL` is an optional browser API override.

#### Ops

Ops is the live operations interface for fleet, routes, incidents, support, and safety/SOS work. Its Next.js app is in `apps/ops`; its launcher reads root-level environment values before starting the API client.

```powershell
pnpm run dev:ops
pnpm --filter @adhocx/ops build
pnpm --filter @adhocx/ops lint
pnpm --filter @adhocx/ops typecheck
```

Open port `7004`. The API must be running for live operational data. No Ops `test` script is declared; run the available lint, typecheck, and build checks. `NEXT_PUBLIC_API_URL` is optional.

#### Corporate

Corporate is the tenant-facing portal for employee, roster, booking, commute, safety, and billing workflows. Its Next.js app is in `apps/corporate` and requires the API for authenticated tenant data.

```powershell
pnpm run dev:corporate
pnpm --filter @adhocx/corporate build
pnpm --filter @adhocx/corporate lint
pnpm --filter @adhocx/corporate typecheck
```

Open port `7006`. No Corporate `test` script is declared; use the available lint, typecheck, and build checks. `NEXT_PUBLIC_API_URL` is optional.

#### Mobile (Driver/Vendor)

The Flutter app in `apps/mobile` contains the driver and vendor/booker experiences. Fetch Dart dependencies with `pnpm --filter @adhocx/mobile exec flutter pub get`. The web launcher passes a local API URL and needs Flutter installed:

```powershell
pnpm run dev:mobile
pnpm --filter @adhocx/mobile run build:web
pnpm --filter @adhocx/mobile exec flutter test
```

The web app is served on port `7003`. The package's `test` script is only a placeholder; `flutter test` above runs the actual Flutter test runner. For Android setup and the local emulator API URL, see [Flutter / Android notes](#flutter--android-notes).

#### Employee App

The Flutter app in `apps/employee_app` is the employee-facing client for employer-arranged transport. Fetch dependencies with `pnpm --filter @adhocx/employee-app exec flutter pub get`; its web launcher uses port `7005`.

```powershell
pnpm run dev:employee
pnpm --filter @adhocx/employee-app run build:web
pnpm --filter @adhocx/employee-app exec flutter test
```

The package's `test` script only prints a reminder; use `flutter test` as shown. For Android, `pnpm run dev:employee:android` launches the Android target and sets the emulator API address. Android requires JDK 17, Android SDK tools, and a running emulator/device.

#### Marketing

Marketing is the public product, content, and lead-acquisition website. Its Astro app is in `apps/marketing`; local development does not require the API for static pages. `API_URL` or `PUBLIC_API_URL` can be supplied for API-backed RSS content.

```powershell
pnpm run dev:marketing
pnpm --filter @adhocx/marketing build
pnpm --filter @adhocx/marketing seo:check
```

Open port `4321`. The post-build script runs its SEO check. No Marketing `test` script is declared.

#### Documentation

This Docusaurus site is the developer and operations reference in `apps/docs`. It can run independently; its Swagger navigation link points to the local API unless overridden.

```powershell
pnpm run dev:docs
pnpm run build:docs
pnpm --filter @adhocx/docs typecheck
pnpm --filter @adhocx/docs check:docs
```

Open port `7007`. The docs development command builds and serves the static site so local search works; use `pnpm --filter @adhocx/docs run dev:watch` for hot reload (search indexing is unavailable in that mode). No separate Docs unit-test script is declared; use the listed type, governance, and production-build checks.

### Flutter / Android notes

The Flutter pubspecs require Dart `>=3.3.0 <4.0.0`; they do not pin a Flutter release. Install Flutter stable, verify `flutter doctor`, and run the corresponding `flutter pub get` command from the table before the first launch.

For Android, install JDK 17 and configure Android Studio with the Android SDK and an emulator or connected device. Check available devices using:

```powershell
flutter doctor
flutter devices
```

The Employee App Android launcher supplies `http://10.0.2.2:7001/api/v1`, which is how an Android emulator reaches the host computer's API. Launch it with:

```powershell
pnpm run dev:employee:android
```

For the Driver/Vendor app, the package's root `dev:mobile:android` alias invokes the normal web launcher, not an Android launcher. To run its Android build locally, use Flutter directly from the app directory and explicitly override its native default API URL (which otherwise points at the deployed API):

```powershell
Set-Location apps/mobile
flutter run --dart-define=API_URL=http://10.0.2.2:7001/api/v1
```

Select the emulator/device shown by `flutter devices` if Flutter asks. For a web browser, use the workspace `pnpm run dev:mobile` command instead; that launcher passes the local API URL. Flutter's `test` scripts in both package manifests only print guidance, so run `flutter test` directly in the relevant Flutter app directory to execute tests.

## 7. Run the complete workspace

Start infrastructure and prepare dependencies first:

```powershell
docker compose up -d postgres redis
pnpm install --frozen-lockfile
pnpm run predev:all
pnpm --filter @adhocx/api exec prisma db push
```

Then start all workspace dev scripts together:

```powershell
pnpm run dev:all
```

This root command starts available `dev` scripts under `apps/*` and `packages/*` in parallel. Keep this terminal open. Flutter and local environment requirements still apply; start only the applications needed if a target platform or SDK is not installed.

For more control, use one terminal per app and run the commands from the previous table. The practical dependency order is: PostgreSQL/Redis → workspace preparation and local schema → API → API clients (Admin, Ops, Corporate, Flutter) and independent sites (Marketing, Docs). Frontends should not be used for API-backed workflows until the API health check succeeds.

| Order | Application / service | Command | Expected result |
|---:|---|---|---|
| 1 | PostgreSQL + Redis | `docker compose up -d postgres redis` | Both local infrastructure containers start |
| 2 | Shared packages + Prisma client | `pnpm run predev:all` | Contracts, domain-core, and Prisma client are prepared |
| 3 | Local schema | `pnpm --filter @adhocx/api exec prisma db push` | Prisma schema is synchronized to the local database |
| 4 | API | `pnpm run dev:api` | API listens on port `7001` |
| 5 | Web clients / Flutter | The matching `pnpm run dev:*` command | Each app appears on its documented local port |
| 6 | Marketing + Docs | `pnpm run dev:marketing` / `pnpm run dev:docs` | Marketing and documentation sites are available |

```mermaid
flowchart LR
  Admin[Admin] --> API[NestJS API]
  Ops[Ops] --> API
  Corporate[Corporate] --> API
  Mobile[Driver/Vendor app] --> API
  Employee[Employee app] --> API
  Marketing[Marketing RSS, when configured] -. optional .-> API
  Docs[Documentation] -. Swagger link .-> API
  API --> Postgres[(PostgreSQL / PostGIS)]
  API --> Redis[(Redis)]
```

The browser and mobile clients call the API; the API owns validation, business rules, database access, and Redis-backed infrastructure. Marketing only calls the API for its optional API-backed RSS content. Docs links to Swagger rather than acting as an API client.

## 8. Build, test, and maintenance commands

| Command | Application | Purpose | When to use |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | Workspace | Install locked Node.js dependencies | Initial setup or after dependency changes |
| `pnpm run predev:all` | Workspace / API | Build shared packages and generate Prisma client | Before starting the API after a clean install |
| `pnpm run dev:all` | Workspace | Start available app and package development scripts in parallel | Full local workspace |
| `pnpm run dev:api` / `dev:admin` / `dev:ops` / `dev:corporate` | API / web clients | Start a single Node.js application | Focused development |
| `pnpm run dev:mobile` / `dev:employee` | Flutter apps | Start configured Flutter web launchers | Flutter web development |
| `pnpm run build` | Workspace | Run Turbo build tasks defined by workspace packages | Workspace build check |
| `pnpm run build:docs` | Documentation | Build the Docusaurus production site and search index | Verify published docs output |
| `pnpm run build:marketing` | Marketing | Build the Astro site and run its SEO post-build check | Marketing release check |
| `pnpm --filter @adhocx/api build` | API | Compile NestJS API | API build check |
| `pnpm --filter @adhocx/api test` | API | Run Jest tests | API behavior changes |
| `pnpm --filter @adhocx/api lint` / `typecheck` | API | Run ESLint / TypeScript checks | API code changes |
| `pnpm --filter @adhocx/admin build` (or `@adhocx/ops`, `@adhocx/corporate`) | Next.js app | Build a specific web app | App build check |
| `pnpm --filter @adhocx/docs typecheck` / `check:docs` | Documentation | Type-check the docs config / run repository documentation checks | Docs changes |
| `pnpm --filter @adhocx/mobile exec flutter test` | Mobile | Run Flutter tests (not the placeholder package `test` script) | Driver/Vendor app changes |
| `pnpm --filter @adhocx/employee-app exec flutter test` | Employee App | Run Flutter tests (not the placeholder package `test` script) | Employee app changes |
| `pnpm --filter @adhocx/mobile run build:apk` / `build:appbundle` | Mobile | Build Android release artifacts | Android release work |
| `pnpm --filter @adhocx/employee-app run build:apk` / `build:appbundle` | Employee App | Build Android release artifacts | Android release work |
| `pnpm run lint` / `pnpm run typecheck` | Workspace | Run configured Turbo lint / typecheck tasks | Workspace validation |
| `docker compose stop postgres redis` | Local infrastructure | Stop the database containers without deleting their data | End of a local session |

The root `format` script formats many files across the repository; for a small docs change, prefer the existing formatter with a specific file rather than formatting the whole workspace.

## 9. Verify the setup

1. Check that the services are running: `docker compose ps`.
2. Open the API health endpoint: [http://localhost:7001/api/v1/health](http://localhost:7001/api/v1/health). A healthy API returns HTTP 200.
3. Open Swagger: [http://localhost:7001/docs](http://localhost:7001/docs).
4. Open the app URLs from the application table. For API-backed pages, use browser developer tools to confirm requests go to `http://localhost:7001/api/v1`.
5. If testing Flutter on Android, confirm the app uses the emulator host address `10.0.2.2` and that the API is still running.
6. To verify the docs search index and production output, run `pnpm run build:docs`; the generated site is written to `apps/docs/build`.

There is no verified, general-purpose local seed or default user account. Therefore a successful health check proves API availability, not that an end-user sign-in workflow has been provisioned. Use only a locally configured authentication/provider workflow.

## 10. Troubleshooting

| Problem | Likely cause | Diagnostic | Resolution |
|---|---|---|---|
| `pnpm install --frozen-lockfile` fails | Wrong pnpm version or inconsistent lockfile | `pnpm --version` | Activate pnpm `10.17.1`; do not regenerate the lockfile unless intentionally changing dependencies |
| Flutter command is missing | Flutter SDK is not installed or not on `PATH` | `flutter --version`; `flutter doctor` | Install Flutter stable and add its `bin` directory to `PATH`; Flutter web launchers cannot run the actual app without it |
| Android build cannot find Java or SDK | JDK 17 / Android SDK is missing or not configured | `java -version`; `flutter doctor -v` | Install JDK 17, Android Studio, and required SDK/platform tools |
| API cannot connect to PostgreSQL | Container is stopped, credentials differ from the initialized volume, or `DATABASE_URL` is wrong | `docker compose ps`; `docker compose logs --tail=80 postgres`; inspect local `DATABASE_URL` without sharing it | Start PostgreSQL, then align the local database URL with the existing Compose volume's user/database |
| API cannot connect to Redis | Redis container is stopped or `REDIS_URL` points elsewhere | `docker compose ps`; `docker compose logs --tail=80 redis` | Start Redis and use `redis://localhost:6379` unless you deliberately changed its host port |
| Port already in use | Another process is listening on an app's port | PowerShell: `Get-NetTCPConnection -LocalPort 7001 -State Listen` (replace `7001` with the affected port) | Stop the process you recognize or configure an unused port where the app supports it |
| Browser says API unavailable / CORS error | API is stopped or frontend override points to a different origin | Open `http://localhost:7001/api/v1/health`; inspect the browser Network panel | Start API and use `http://localhost:7001/api/v1`; local origins are allowed in API development mode |
| Frontend starts but API-backed flows fail | Local database schema has not been applied, or optional provider integration is not configured | Check API logs and run the local `prisma db push` command | Apply schema to the local database; configure provider credentials only when testing that integration |
| Existing DB container ignores changed credentials | PostgreSQL volume was initialized earlier | `docker compose logs --tail=80 postgres` | Keep and use the volume's existing local credentials, or follow the team's approved local database reset procedure; do not delete volumes casually |
| Android app can open but API requests fail | App is using `localhost` instead of the emulator's host bridge, or API is not reachable | Confirm API health on the host; inspect the app's API URL | Use `http://10.0.2.2:7001/api/v1` for Android emulator. A physical phone needs a reachable host/LAN address and matching API/CORS configuration |
| Docs build fails after editing | Broken sidebar doc ID, Markdown link, or Docusaurus config | `pnpm run build:docs` | Fix the reported link/config issue; builds treat broken links as errors |

## Related documentation

- [Welcome](./index.md)
- [Environment configuration](./platform/engineering/environment-configuration.md)
- [Workspace and local development](./platform/engineering/local-development.md)
- [Application overview](./apps/index.md)
- [API architecture](./apps/api/architecture.md)
