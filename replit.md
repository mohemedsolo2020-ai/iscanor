# Overview

This is a cinema/movie streaming application called "سينما المتابعين" (Cinema of Followers) built with a full-stack TypeScript architecture. The application allows users to browse, search, and track their watching progress for movies, series, anime, and documentaries. It features a modern Arabic-friendly interface with comprehensive media management capabilities.

The system provides functionality for user profiles, favorites management, watch history tracking, notifications, and a responsive design that works across desktop and mobile devices.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with custom shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and RTL (Arabic) support
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging
- **Data Layer**: In-memory storage implementation with interface for easy database migration
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)

## Database Design
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon serverless)
- **Schema**: Comprehensive media catalog with user management, watch history, favorites, and notifications
- **Key Tables**:
  - Users: Profile management with avatar support
  - Media: Movies, series, anime, documentaries with Arabic/English titles
  - Watch History: Progress tracking with episode/season support
  - Favorites: User's preferred content lists
  - Notifications: System alerts for new content and reminders

## Design Patterns
- **Component Architecture**: Reusable UI components with consistent theming
- **Custom Hooks**: Abstracted API calls and state management logic
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Internationalization**: Arabic language support with RTL layout considerations

## Authentication and Authorization
- **Session-based Authentication**: Express sessions for user state management
- **Default User System**: Simplified authentication with default user for development
- **Profile Management**: User data updates with form validation

# External Dependencies

## Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm & drizzle-kit**: Type-safe ORM and database migration tools
- **@tanstack/react-query**: Server state management and caching
- **express**: Web application framework for Node.js

## UI and Styling
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library for consistent iconography

## Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the entire application
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **wouter**: Lightweight routing library for React

## Form and Validation
- **react-hook-form**: Performant forms with easy validation
- **@hookform/resolvers**: Integration with validation libraries
- **zod**: Schema validation for type-safe data handling

## Date and Utilities
- **date-fns**: Date manipulation and formatting with Arabic locale support
- **clsx & twMerge**: Utility functions for conditional CSS classes
- **nanoid**: Unique ID generation for various entities

## Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **express-session**: Session middleware for user state persistence