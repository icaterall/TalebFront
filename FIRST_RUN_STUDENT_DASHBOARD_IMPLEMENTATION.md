# First-Run Student Dashboard Implementation Guide

## 🎯 Overview

This document provides a complete implementation guide for the first-run student dashboard experience that ensures **no empty screens** and provides **immediate learning opportunities**.

## ✅ What's Already Done

### 1. **Translations Added** ✅
- All English translations added to `src/assets/i18n/en.json`
- All Arabic translations added to `src/assets/i18n/ar.json`
- Includes: welcome messages, CTAs, assistant suggestions

### 2. **Infrastructure Ready** ✅
- Loading spinner and error handling
- Circuit breakers to prevent infinite loops
- Arabic default language configured
- App configuration stable

## 📋 Implementation Roadmap

### Phase 1: Backend Services (Priority)

#### A. Recommendations Service
**Endpoint:** `GET /api/v1/recommendations`

**Query Parameters:**
- `country_id` (required)
- `state_id` (optional)
- `stage_id` (required)
- `locale` (required)
- `limit` (optional, default: 3)

**Response:**
```json
{
  "recommendations": [
    {
      "lesson_id": 123,
      "title": "Introduction to Algebra",
      "est_minutes": 15,
      "tags": ["math", "algebra", "beginner"]
    }
  ]
}
```

**Location:** `TalebBack/controllers/recommendations.controller.js`

#### B. AI Intro Pack Orchestrator
**Endpoint:** `POST /api/v1/ai/orchestrate/intro-pack`

**Request Body:**
```json
{
  "student": {
    "stage_id": 5,
    "age": 15,
    "country_id": 1,
    "state_id": 10,
    "locale": "ar"
  }
}
```

**Response:**
```json
{
  "lesson_id": 456,
  "title": "Welcome to AnaTaleb",
  "est_minutes": 10,
  "sections": [...],
  "quiz": [...],
  "media": {...}
}
```

**Location:** `TaleBack/controllers/ai-intro.controller.js`

#### C. Join Class Endpoint
**Endpoint:** `POST /api/v1/students/join-class`

**Request Body:**
```json
{
  "class_code": "ABC123"
}
```

**Location:** `TalebBack/controllers/student.controller.js`

### Phase 2: Frontend Services

#### A. Recommendations Service
**File:** `src/app/core/services/recommendations.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  getRecommendations(filters: {
    country_id: number;
    state_id?: number;
    stage_id: number;
    locale: string;
    limit?: number;
  }): Observable<Recommendation[]> {
    // Implementation
  }
}
```

#### B. AI Intro Pack Service
**File:** `src/app/core/services/ai-intro.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AIIntroService {
  generateIntroPack(student: StudentInfo): Observable<AIIntroPack> {
    // Implementation
  }
}
```

### Phase 3: First-Run Dashboard Component

**File:** `src/app/features/student/dashboard/student-dashboard.component.ts`

**Key Changes:**
1. Check if `first_run_completed === false`
2. Load recommendations on init
3. If no recommendations, call AI intro pack
4. Show join class modal
5. Display assistant suggestions

### Phase 4: Join Class Modal

**File:** `src/app/features/student/dashboard/join-class-modal.component.ts`

- Input field for class code
- Join button
- Success/error handling
- Navigate to courses after success

### Phase 5: Assistant Component

**File:** `src/app/shared/assistant/assistant.component.ts`

- Chat-like interface
- Pre-loaded suggestions
- OpenAI API integration
- Context-aware responses

## 🔄 User Flow

### First Visit (New Student)

1. **Login/Signup** → Auto-redirects to `/student/dashboard`
2. **Dashboard Checks:**
   - `preferences.onboarding.first_run_completed === false`
   - Load user info: `country_id`, `state_id`, `stage_id`, `locale`
3. **API Calls:**
   - `GET /recommendations` with user filters
4. **Render Logic:**
   - **If recommendations exist:** Show top lesson in "Start a lesson now" CTA
   - **If no recommendations:** Call `POST /ai/orchestrate/intro-pack` and show generated lesson
5. **Display:**
   - Welcome card with student name
   - Three CTAs (Join class, Start lesson, Explore topics)
   - Assistant with 2-3 smart suggestions

### After First Lesson Complete

- Set `preferences.onboarding.first_run_completed = true`
- Regular dashboard shows (existing design)

## 🎨 UI Components Needed

### 1. First-Run Welcome Card
- Large "Welcome, {name}!" headline
- Three action buttons side-by-side

### 2. Join Class Modal
- Input field
- Join button
- Loading state
- Success message

### 3. Lesson Preview Card
- Title
- Time estimate badge
- "Start" button
- Optional: "Try also..." mini cards

### 4. Assistant Chat Bubble
- Always visible
- Pre-filled suggestions
- Input field at bottom
- Send button

## 🔧 Data Schema Updates

### users table
Add to `preferences` JSONB column:

```json
{
  "onboarding": {
    "first_run_completed": false,
    "intro_pack_lesson_id": null
  },
  "ui": {
    "home_cta_layout": ["join_class", "start_now", "explore"]
  }
}
```

### users table
Add to `metadata` JSONB column:

```json
{
  "geo": {
    "ip_country_iso": "OM",
    "detected_at": "2025-10-29T10:00:00Z"
  },
  "first_login_at": "2025-10-29T10:00:00Z"
}
```

### lessons table
For AI-generated lessons:

- `is_generated: boolean` (true for AI-created)
- `visibility: enum('private', 'public')` (private for student-specific)
- `owner_user_id: foreign_key` (student who owns the lesson)

## 📊 Analytics Events

Track these events:

1. **first_run_viewed**: Dashboard loaded for first time
2. **recommendation_clicked**: Student clicked "Start a lesson now"
3. **intro_pack_generated**: AI generated a lesson (fallback)
4. **class_code_entered**: Student entered a class code
5. **class_joined**: Successfully joined a class
6. **assistant_suggestion_clicked**: Clicked an assistant suggestion
7. **first_lesson_started**: Started first lesson
8. **first_lesson_completed**: Completed first lesson

## 🚀 Deployment Checklist

- [ ] Backend recommendations endpoint
- [ ] Backend AI intro pack endpoint
- [ ] Backend join class endpoint
- [ ] Frontend recommendations service
- [ ] Frontend AI intro service
- [ ] Frontend join class modal
- [ ] Frontend assistant component
- [ ] Update student dashboard for first-run
- [ ] Add database schema updates
- [ ] Add analytics tracking
- [ ] Test with new student flow
- [ ] Test with existing student flow
- [ ] Test Arabic translations
- [ ] Test English translations

## 📝 Notes

- **No empty states**: Always show content (recommendations or AI-generated lesson)
- **Low friction**: 1-click actions
- **Progressive enhancement**: Works even if API calls fail (fallback to existing design)
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Lazy load heavy components
- **Responsive**: Mobile-first design

## 🎯 Next Steps

1. **Start with Backend:**
   - Implement `/recommendations` endpoint
   - Implement `/ai/orchestrate/intro-pack` endpoint
   - Update `join-class` functionality

2. **Then Frontend:**
   - Create recommendations service
   - Create join class modal
   - Update dashboard to detect first-run
   - Add assistant component

3. **Finally:**
   - Test end-to-end
   - Deploy to production
   - Monitor analytics

---

**Last Updated:** 2025-10-29
**Status:** Planning Phase - Ready for Implementation


