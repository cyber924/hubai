# StyleHub - AI-Powered Fashion Trend Automation

## Overview

StyleHub is a comprehensive AI-powered fashion e-commerce automation platform that helps online store owners collect, analyze, and distribute trending fashion products across multiple marketplaces. The system uses Google's Gemini AI to analyze product trends and automatically scrapes products from Korean fashion platforms (Naver, Coupang, ZigZag) for intelligent product curation and marketplace synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern single-page application built with React 18 and TypeScript for type safety
- **Wouter**: Lightweight client-side routing instead of React Router for minimal bundle size
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with pre-built component library using Radix UI primitives
- **TanStack Query**: Server state management for data fetching, caching, and synchronization
- **Vite**: Modern build tool for fast development and optimized production builds

### Backend Architecture  
- **Express.js**: RESTful API server with session-based authentication
- **TypeScript**: Full-stack type safety with shared schemas between client and server
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple for persistent login state
- **Password Security**: bcrypt hashing for secure password storage

### Database & ORM
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Drizzle ORM**: Type-safe SQL query builder with schema migrations
- **Shared Schema**: Centralized type definitions in `/shared/schema.ts` for frontend/backend consistency

### AI & Automation Services
- **Google Gemini AI**: Product analysis for categorization, pricing recommendations, and trend identification
- **Web Scraping Engine**: Automated product collection from Korean fashion platforms with configurable scheduling
- **Product Processing Pipeline**: Multi-stage workflow (collect → analyze → register → sync) with status tracking

### Authentication & Payment
- **Session-based Auth**: Secure session management with PostgreSQL storage
- **Stripe Integration**: Subscription billing with multiple pricing tiers (Starter, Pro, Enterprise)
- **Role-based Access**: Admin dashboard with user management capabilities

### External Dependencies

**Core Services:**
- **Neon Database**: Serverless PostgreSQL hosting for scalable data storage
- **Google Gemini API**: AI-powered product analysis and trend prediction
- **Stripe**: Payment processing and subscription management

**Korean E-commerce Platforms:**
- **Naver Shopping**: Product scraping and marketplace integration
- **Coupang**: Large-scale product collection and sync capabilities  
- **ZigZag**: Fashion-focused platform for trend discovery

**Development & Deployment:**
- **Replit**: Development environment with integrated deployment pipeline
- **Vite Plugins**: Development experience enhancements including error overlay and dev banner
- **TypeScript Configuration**: Shared type system across client, server, and shared directories

**UI & Styling:**
- **Tailwind CSS**: Utility-first styling with custom design system
- **Radix UI**: Accessible component primitives for complex UI patterns
- **Lucide React**: Consistent icon system throughout the application