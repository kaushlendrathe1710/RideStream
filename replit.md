# Overview

This is a ride-hailing web application built with React (frontend) and Express.js (backend), providing a dual-sided platform for both riders and drivers. The application mimics the core functionality of services like Uber or Ola, featuring real-time ride matching, location tracking, and a mobile-first responsive design optimized for mobile devices.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React 18 with TypeScript, using Vite as the build tool for fast development and optimized production builds.

**UI Framework**: Built with Tailwind CSS and shadcn/ui components for a consistent, mobile-first design system. The application targets a maximum width mobile layout (max-w-md) with shadow effects to simulate a mobile app experience.

**State Management**: TanStack Query (React Query) handles server state management with automatic caching, background updates, and optimistic updates. No global state management library is used, keeping state local to components.

**Routing**: Wouter provides lightweight client-side routing with separate routes for rider and driver flows:
- Rider routes: `/`, `/rider`, `/rider/booking`, `/rider/trip/:rideId`
- Driver routes: `/driver`, `/driver/ride-request/:rideId`, `/driver/trip/:rideId`

**Architecture Pattern**: The frontend follows a feature-based organization with shared UI components, custom hooks for reusable logic (geolocation, mobile detection), and mock data for development.

## Backend Architecture

**Framework**: Express.js with TypeScript, using ESM modules for modern JavaScript support.

**API Design**: RESTful API structure with route handlers organized by resource type (users, drivers, rides). All API endpoints are prefixed with `/api/`.

**Data Layer**: In-memory storage implementation with a well-defined interface (IStorage) that can be easily swapped for database implementations. The storage layer includes seeded mock data for development and testing.

**Real-time Features**: Polling-based updates using React Query's refetch intervals for ride status changes, driver location updates, and new ride requests.

## Data Storage Solutions

**Development Storage**: MemStorage class provides in-memory data persistence with pre-seeded users, drivers, and rides for immediate development testing.

**Database Schema**: Designed with Drizzle ORM for PostgreSQL with three main entities:
- **Users**: Handles both riders and drivers with a type field differentiation
- **Drivers**: Extended driver-specific information linked to users
- **Rides**: Complete ride lifecycle from request to completion with status tracking

**Schema Design Rationale**: The separation between users and drivers allows the same person to be both a rider and driver, while the ride entity captures the complete journey lifecycle with timestamps and location data.

## Authentication and Authorization

**Current Implementation**: Simplified phone number-based authentication without session management, suitable for development and prototyping.

**Session Infrastructure**: Includes connect-pg-simple for PostgreSQL session storage, indicating preparation for production-grade session management.

## Real-time Communication

**Approach**: Polling-based real-time updates using React Query's refetch intervals rather than WebSockets, providing a simpler implementation suitable for moderate real-time requirements.

**Update Intervals**: Different polling frequencies based on data criticality:
- Ride status updates: 3-5 second intervals
- Driver location: Configurable based on online status
- Ride requests: 5-second intervals when driver is online

# External Dependencies

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: Comprehensive component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **class-variance-authority**: Type-safe component variant management
- **Lucide React**: Icon library with consistent styling

## Data Management
- **TanStack React Query**: Server state management with caching and synchronization
- **Drizzle ORM**: TypeScript-first ORM for database operations
- **Drizzle Zod**: Schema validation integration
- **Neon Database**: PostgreSQL database service (via @neondatabase/serverless)

## Development Tools
- **Vite**: Fast build tool with HMR for development
- **TypeScript**: Type safety across the entire application
- **Wouter**: Minimalist routing library
- **React Hook Form**: Form state management with validation

## Production Infrastructure
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **esbuild**: Fast JavaScript bundler for production builds

## Geographic and Location Services
The application is architected to integrate with mapping services (Google Maps, Mapbox) for:
- Real-time location tracking
- Route optimization and navigation
- Distance and duration calculations
- Interactive map displays

Currently uses mock implementations with the infrastructure ready for production mapping service integration.