# ConstructERP - Attendance Management System

A comprehensive construction site attendance management system with role-based workflow approval.

## 🏗️ System Overview

ConstructERP streamlines construction site attendance management through a three-tier approval system:

1. **Foremen** submit daily attendance for their workers
2. **Site Incharges** review and approve attendance submissions  
3. **Admins** provide final approval for processed attendance

## ✨ Key Features

### 🔐 Role-Based Access Control
- **Foreman**: Submit attendance, view own submissions
- **Site Incharge**: Review foreman submissions, manage workers
- **Admin**: Final approval, site management, system oversight

### 📊 Attendance Workflow
- ✅ **Submit**: Foremen record daily worker attendance with hours and overtime
- 🔍 **Review**: Site incharges verify and approve submissions with checkboxes
- ✅ **Approve**: Admins provide final approval for payroll processing

### 💼 Management Features
- Worker database with roles and wage information
- Construction site management
- Real-time dashboard with statistics
- Comprehensive audit trail

## 🚀 Quick Start

### Demo Accounts

Try the system with these demo accounts:

| Role | Username | Password |
|------|----------|----------|
| Foreman | `demo_foreman` | `demo123` |
| Site Incharge | `demo_site_incharge` | `demo123` |
| Admin | `demo_admin` | `demo123` |

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:8080
```

## 🎯 User Workflows

### Foreman Workflow
1. Login and navigate to "Submit Attendance"
2. Select workers and mark present/absent
3. Enter working hours and overtime
4. Add remarks if needed
5. Submit for site incharge review

### Site Incharge Workflow  
1. Login and go to "Review Attendance"
2. Open pending submissions
3. Review each worker entry with checkboxes
4. Edit entries if corrections needed
5. Add comments and forward to admin

### Admin Workflow
1. Login and access "Admin Approval"
2. Review site incharge approved submissions
3. Add final comments
4. Approve for payroll processing

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS + Radix UI
- **Backend**: Express.js + RESTful API
- **Database**: MongoDB Atlas ready (currently in-memory for demo)
- **Authentication**: Role-based JWT authentication
- **UI**: Modern component library with responsive design

## 📱 Features

### Dashboard
- Real-time attendance statistics
- Weekly attendance trends
- Pending approvals count
- Quick action buttons

### Attendance Management
- Intuitive worker selection
- Hours and overtime tracking
- Remarks and comments system
- Status tracking throughout workflow

### Responsive Design
- Works on desktop, tablet, and mobile
- Touch-friendly interface for field use
- Offline-ready PWA capabilities

## 🚀 Deployment

### Quick Deploy
1. **Connect to hosting**: [Connect to Netlify](#open-mcp-popover) or [Connect to Vercel](#open-mcp-popover)
2. **Set up database**: [Connect to MongoDB Atlas](#database-setup)
3. **Configure environment variables**
4. **Deploy and go live**

### Environment Setup
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secure-secret
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Database Setup
Currently uses in-memory storage for demo. For production:

1. **Set up MongoDB Atlas**
2. **Install MongoDB driver**: `pnpm add mongodb`
3. **Configure connection string**
4. **Uncomment MongoDB code in database/connection.ts**

### Customization
- **Workers**: Add/modify worker types and wages
- **Sites**: Configure multiple construction sites
- **Workflow**: Customize approval stages
- **UI**: Modify components and styling

## 📊 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Foreman       │    │  Site Incharge   │    │     Admin       │
│                 │    │                  │    │                 │
│ Submit          │───▶│ Review &         │───▶│ Final           │
│ Attendance      │    │ Approve          │    │ Approval        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Development

### Project Structure
```
client/           # React frontend
├── pages/        # Route components
��── components/   # Reusable UI components
└── lib/          # Utilities and helpers

server/           # Express backend
├── routes/       # API endpoints
└── database/     # Database models and connection

shared/           # Shared TypeScript types
```

### Available Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm test         # Run tests
pnpm typecheck    # Type checking
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- **Issues**: Report bugs and feature requests
- **Community**: Join discussions and get help

---

Built with ❤️ for construction teams everywhere. Streamline your attendance management today!
