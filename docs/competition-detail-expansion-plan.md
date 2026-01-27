# Implementation Plan: Competition Detail Page Expansion

## Overview

Expand the competition detail page and creation flow to support richer content including data documentation, structured rules, and improved navigation. Each phase is a separate branch with focused commits and Playwright tests.

---

## Phase 1: Page Structure & Navigation Refactor

**Branch:** `feature/competition-detail-tabs`

**Goal:** Restructure the competition detail page with expanded tab navigation and persistent header.

### Changes

**Backend:**
- No changes required

**Frontend:**
- Refactor `competition-detail.component.ts` to support new tab structure
- Add tabs: Overview, Data, Leaderboard, Submit, Rules, Discussion
- Create persistent header component with thumbnail, title, tagline, metadata row
- Extract tab content into separate child components for maintainability

### File Structure
```
competition-detail/
├── competition-detail.component.ts (main container)
├── competition-header/
│   └── competition-header.component.ts
├── tabs/
│   ├── overview-tab/
│   ├── data-tab/
│   ├── leaderboard-tab/
│   ├── submit-tab/
│   ├── rules-tab/
│   └── discussion-tab/
```

### Playwright Tests
- Navigation between all tabs works correctly
- Header remains visible when switching tabs
- Deep linking to specific tabs via URL (e.g., `/competitions/slug?tab=data`)
- Mobile responsive behavior

### Commits
1. Create competition header component
2. Extract existing tabs into child components
3. Add placeholder components for new tabs (Data, Rules)
4. Add URL-based tab routing
5. Add Playwright tests for tab navigation

---

## Phase 2: Overview Tab Enhancement

**Branch:** `feature/competition-overview-sections`

**Goal:** Structure the Overview tab with Description, Evaluation, Timeline, and FAQ sections.

### Changes

**Backend:**
- Add `evaluation_description` field to Competition model (rich text)
- Add `CompetitionFAQ` model (competition_id, question, answer, order)
- Add FAQ CRUD endpoints
- Migration for new fields/tables

**Frontend:**
- Create sectioned layout for Overview tab
- Add FAQ accordion component
- Display evaluation metric with explanation
- Add timeline visualization (start date → end date with current position)

### Database Schema
```sql
-- Add to competitions table
ALTER TABLE competitions ADD COLUMN evaluation_description TEXT;

-- New table
CREATE TABLE competition_faqs (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Playwright Tests
- Overview tab displays all sections
- FAQ accordion expands/collapses correctly
- Timeline shows correct dates and current state
- Empty states display appropriately

### Commits
1. Add evaluation_description field and migration
2. Create CompetitionFAQ model and migration
3. Add FAQ API endpoints (CRUD)
4. Create Overview tab sections UI
5. Add FAQ accordion component
6. Add timeline component
7. Add Playwright tests

---

## Phase 3: Data Tab - File Management

**Branch:** `feature/competition-data-files`

**Goal:** Support multiple data files per competition with metadata.

### Changes

**Backend:**
- Create `CompetitionFile` model (competition_id, filename, display_name, purpose, file_path, file_size, file_type)
- Add file upload endpoint for competition files
- Add file list endpoint
- Add file download endpoint (individual and zip all)
- Storage backend integration for competition files

**Frontend:**
- Create Data tab with two-column layout
- File list panel (left) with file selector
- File details panel (right) placeholder
- Download All button
- File upload UI in edit mode

### Database Schema
```sql
CREATE TABLE competition_files (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    purpose VARCHAR(500),
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints
- `POST /competitions/{slug}/files` - Upload file
- `GET /competitions/{slug}/files` - List files
- `GET /competitions/{slug}/files/{id}` - Download single file
- `GET /competitions/{slug}/files/download-all` - Download zip
- `DELETE /competitions/{slug}/files/{id}` - Delete file
- `PATCH /competitions/{slug}/files/{id}` - Update metadata

### Playwright Tests
- File list displays all competition files
- Clicking file selects it and updates right panel
- Download individual file works
- Download All creates zip with all files
- File upload works (in edit mode)

### Commits
1. Create CompetitionFile model and migration
2. Add file storage service methods
3. Add file upload endpoint
4. Add file list and download endpoints
5. Create Data tab file list UI
6. Add file selection behavior
7. Add Download All functionality
8. Add Playwright tests

---

## Phase 4: Data Tab - Preview & Dictionary

**Branch:** `feature/competition-data-dictionary`

**Goal:** Add data preview and data dictionary functionality.

### Changes

**Backend:**
- Create `DataDictionaryEntry` model (file_id, column_name, definition, encoding, display_order)
- Add endpoint to get CSV preview (first N rows)
- Add endpoint to auto-detect columns from uploaded CSV
- Add CRUD endpoints for dictionary entries
- Add variable_notes field to CompetitionFile model

**Frontend:**
- Add data preview component (table view of first 10-20 rows)
- Add data dictionary table component
- Add variable notes display
- Handle non-tabular files gracefully

### Database Schema
```sql
CREATE TABLE data_dictionary_entries (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES competition_files(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    definition TEXT,
    encoding TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(file_id, column_name)
);

-- Add to competition_files
ALTER TABLE competition_files ADD COLUMN variable_notes TEXT;
```

### API Endpoints
- `GET /competitions/{slug}/files/{id}/preview` - Get first N rows
- `GET /competitions/{slug}/files/{id}/columns` - Auto-detect columns
- `GET /competitions/{slug}/files/{id}/dictionary` - Get dictionary entries
- `PUT /competitions/{slug}/files/{id}/dictionary` - Bulk update dictionary

### Playwright Tests
- CSV files show preview table
- Data dictionary displays for selected file
- Non-CSV files show appropriate placeholder
- Variable notes display correctly

### Commits
1. Create DataDictionaryEntry model and migration
2. Add CSV preview endpoint with pandas
3. Add column detection endpoint
4. Add dictionary CRUD endpoints
5. Create data preview component
6. Create data dictionary table component
7. Add variable notes display
8. Add Playwright tests

---

## Phase 5: Rules System

**Branch:** `feature/competition-rules`

**Goal:** Implement checkbox-based rules with custom additions.

### Changes

**Backend:**
- Create `RuleTemplate` model (category, template_text, has_parameter, parameter_type)
- Create `CompetitionRule` model (competition_id, rule_template_id, is_enabled, parameter_value, custom_text)
- Seed predefined rule templates
- Add rules endpoints

**Frontend:**
- Create Rules tab display (bulleted list of enabled rules)
- Create rules editor for competition edit page
- Checkbox interface grouped by category
- Parameter inputs where applicable
- Custom rule addition

### Database Schema
```sql
CREATE TABLE rule_templates (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    template_text TEXT NOT NULL,
    has_parameter BOOLEAN DEFAULT FALSE,
    parameter_type VARCHAR(50), -- 'number', 'date', 'text'
    parameter_label VARCHAR(100),
    display_order INTEGER DEFAULT 0
);

CREATE TABLE competition_rules (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    rule_template_id INTEGER REFERENCES rule_templates(id),
    is_enabled BOOLEAN DEFAULT TRUE,
    parameter_value VARCHAR(255),
    custom_text TEXT, -- For custom rules (rule_template_id is NULL)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Predefined Rule Templates
```
Team Formation:
- "Teams may have a maximum of {n} members"
- "Team mergers are allowed until {date}"
- "Participants may only belong to one team"

Submissions:
- "Daily submission limit: {n} per day"
- "Submissions must include source code"
- "External data is permitted if documented"

Scoring:
- "Final ranking uses private leaderboard scores"
- "Ties are broken by earliest submission time"

Conduct:
- "Share knowledge freely in discussions"
- "Cite sources when using external code"
```

### Playwright Tests
- Rules tab displays enabled rules correctly
- Rule parameters render with values
- Custom rules appear in the list
- Rules editor checkboxes work
- Parameter inputs save correctly

### Commits
1. Create RuleTemplate model and migration
2. Create CompetitionRule model and migration
3. Seed predefined rule templates
4. Add rules API endpoints
5. Create Rules tab display component
6. Create rules editor component
7. Add parameter input handling
8. Add custom rule support
9. Add Playwright tests

---

## Phase 6: Competition Edit Flow Enhancement

**Branch:** `feature/competition-edit-expansion`

**Goal:** Expand the competition edit form to support all new content.

### Changes

**Frontend:**
- Restructure edit page into stepped/sectioned layout
- Add Step 1: Basics (existing fields)
- Add Step 2: Description & Evaluation (rich text, FAQ management)
- Add Step 3: Data (file management, dictionary editor)
- Add Step 4: Rules (checkbox editor)
- Add Step 5: Review & Publish
- Section navigation sidebar

### Components
```
competition-edit/
├── competition-edit.component.ts (container with section nav)
├── sections/
│   ├── basics-section/
│   ├── description-section/
│   ├── data-section/
│   │   ├── file-upload/
│   │   └── dictionary-editor/
│   ├── rules-section/
│   └── review-section/
```

### Playwright Tests
- All sections accessible and save correctly
- Section navigation works
- File upload in data section works
- Dictionary editor saves entries
- Rules checkboxes persist
- Draft vs published state handling

### Commits
1. Create section navigation structure
2. Refactor basics section
3. Create description section with FAQ editor
4. Create data section with file upload
5. Create dictionary editor modal/panel
6. Create rules section editor
7. Create review section
8. Add save/publish flow
9. Add Playwright tests

---

## Phase 7: Smart Defaults for Data Dictionary

**Branch:** `feature/data-dictionary-suggestions`

**Goal:** Auto-suggest data dictionary definitions based on column names.

### Changes

**Backend:**
- Create column name parser utility
- Add heuristics for common patterns:
  - `*_id` → identifier fields
  - `is_*`, `has_*`, `was_*` → boolean fields
  - `*_at`, `*_date` → timestamp fields
  - Columns with only 0/1 values → binary encoding
  - `target`, `label`, `y` → prediction target
- Return suggestions in column detection endpoint

**Frontend:**
- Display suggestions in dictionary editor (muted/italic)
- "Accept" button per suggestion
- "Accept All Suggestions" bulk action
- Clear visual distinction between suggested and confirmed values

### API Response Enhancement
```json
{
  "columns": [
    {
      "name": "customer_id",
      "dtype": "int64",
      "suggested_definition": "Unique customer identifier",
      "suggested_encoding": null
    },
    {
      "name": "is_churned",
      "dtype": "int64",
      "suggested_definition": "Whether the customer churned",
      "suggested_encoding": "0 = No, 1 = Yes"
    }
  ]
}
```

### Playwright Tests
- Suggestions appear for recognized patterns
- Accept individual suggestion works
- Accept All works
- Suggestions don't overwrite existing definitions

### Commits
1. Create column name parser utility
2. Add dtype-based heuristics
3. Integrate suggestions into column detection endpoint
4. Add suggestion display in dictionary editor
5. Add accept/reject suggestion UI
6. Add Playwright tests

---

## Phase 8: Polish & Integration

**Branch:** `feature/competition-detail-polish`

**Goal:** Final polish, edge cases, and integration testing.

### Changes
- Empty state handling for all sections
- Loading states and error handling
- Mobile responsive adjustments
- Performance optimization (lazy loading tabs)
- Accessibility review
- Cross-browser testing

### Playwright Tests
- Full user journey: create competition → add all content → participant views
- Empty competition displays gracefully
- Error states handled appropriately
- Mobile viewport tests

### Commits
1. Add empty states for all new sections
2. Add loading states
3. Error handling improvements
4. Mobile responsive fixes
5. Performance optimization
6. Accessibility improvements
7. Comprehensive integration tests

---

## Summary

| Phase | Branch | Key Deliverable |
|-------|--------|-----------------|
| 1 | `feature/competition-detail-tabs` | Tab structure & header |
| 2 | `feature/competition-overview-sections` | Overview with FAQ |
| 3 | `feature/competition-data-files` | Multi-file management |
| 4 | `feature/competition-data-dictionary` | Preview & dictionary |
| 5 | `feature/competition-rules` | Rules system |
| 6 | `feature/competition-edit-expansion` | Edit flow enhancement |
| 7 | `feature/data-dictionary-suggestions` | Smart defaults |
| 8 | `feature/competition-detail-polish` | Polish & integration |

Each phase should be merged to master before starting the next. All phases include Playwright tests to ensure functionality.

---

## Dependencies

- Phases 1-2 can proceed independently
- Phase 3 requires Phase 1 (Data tab exists)
- Phase 4 requires Phase 3 (files exist)
- Phase 5 requires Phase 1 (Rules tab exists)
- Phase 6 requires Phases 2-5 (all content types exist)
- Phase 7 requires Phase 4 (dictionary exists)
- Phase 8 requires all previous phases

---

## Estimated Scope

Each phase represents roughly:
- 3-8 commits
- Backend + Frontend + Tests
- Independently deployable increment

Total: ~40-60 commits across 8 branches
