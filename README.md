# MCPHub
The NPM for MCP Servers - A secure registry and marketplace for Model Context Protocol (MCP) servers with advanced security scanning, orchestration capabilities, and real-time analytics.

#### What is MCPHub?
MCPHub is a comprehensive platform for discovering, installing, and managing MCP servers. It provides:

- Secure Registry: Curated collection of MCP servers with automated security scanning<br>
- Advanced Search: Filter by category, security score, compatibility, and more<br>
- Orchestration Engine: Chain multiple MCP servers together for complex workflows<br>
- Security Dashboard: Real-time vulnerability monitoring and threat detection<br>
- Analytics: Performance metrics and usage insights<br>

#### Features
- 🔍 Smart Discovery - Advanced search with filters and recommendations<br>
- 🛡️ Security First - Automated vulnerability scanning and trust scoring<br>
- ⚡ Orchestration - Chain servers together with visual workflow builder<br>
- 📊 Analytics - Real-time performance and usage monitoring<br>
- 🌙 Dark Mode - Beautiful UI with light/dark theme support<br>
- 🔐 User Management - Favorites, installations, and personal settings<br>

#### Tech Stack
- Frontend: React 18, TypeScript, Tailwind CSS<br>
- Backend: Supabase (PostgreSQL, Auth, RLS)<br>
- Search: Full-text search with ranking algorithms<br>
- Security: Automated vulnerability scanning and policies<br>
- Deployment: Vite build system<br>

#### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account (for database)

#### Installation
- Clone the repository
```
git clone <repository-url>
cd mcphub
```
- Install dependencies
```
npm install
```
- Set up environment variables
```
cp .env.example .env
```
Add your Supabase credentials to .env:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
- Set up Supabase database
Create a new Supabase project
Run the migrations in supabase/migrations/ in order
Or use the Supabase CLI: `supabase db push`
- Start the development server
```
npm run dev
```
Open your browser
Navigate to `http://localhost:5173`

Available Scripts
`npm run dev` - Start development server<br>
`npm run build` - Build for production<br>
`npm run preview` - Preview production build<br>
`npm run lint` - Run ESLint<br>

#### Environment Variables
| Variable | Description | Required |
| -------- | ----------- | -------- |
| VITE_SUPABASE_URL	| Your Supabase project URL	| Yes |
| VITE_SUPABASE_ANON_KEY | Your Supabase anonymous key | Yes |

#### Database Setup
The application uses Supabase with the following main tables:
mcp_servers - Server registry<br>
user_favorites - User favorites<br>
server_installations - Installation tracking<br>
security_scan_results - Security scan data<br>
server_reputation - Trust scores<br>

#### Contributing
Fork the repository<br>
Create a feature branch<br>
Make your changes<br>
Run tests and linting<br>
Submit a pull request

#### Support
For issues and questions, please open a GitHub issue.
