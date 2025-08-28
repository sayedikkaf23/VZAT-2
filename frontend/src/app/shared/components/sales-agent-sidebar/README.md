# Sales Agent Sidebar Component

A reusable Angular component for displaying sales agent contact information.

## Usage

### Basic Usage
```html
<app-sales-agent-sidebar 
  [salesAgent]="salesAgent">
</app-sales-agent-sidebar>
```

### With Custom Title and Subtitle
```html
<app-sales-agent-sidebar 
  [salesAgent]="salesAgent"
  title="Need Help?"
  subtitle="Contact your representative:">
</app-sales-agent-sidebar>
```

### Without Title and Subtitle
```html
<app-sales-agent-sidebar 
  [salesAgent]="salesAgent"
  [showTitle]="false"
  [showSubtitle]="false">
</app-sales-agent-sidebar>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `salesAgent` | `SalesAgent` | Required | Sales agent data object |
| `title` | `string` | 'Need Assistance?' | Title text |
| `subtitle` | `string` | 'Contact your sales agent:' | Subtitle text |
| `showTitle` | `boolean` | `true` | Whether to show the title |
| `showSubtitle` | `boolean` | `true` | Whether to show the subtitle |

## SalesAgent Interface

```typescript
interface SalesAgent {
  name: string;
  position: string;
  faxNumber: string;
  phoneNumber: string;
  email: string;
  mobNo1?: string;
  mobNo2?: string;
  token?: number;
}
```

## Features

- Displays sales agent name and position
- Shows contact information (fax, phone, mobile, email)
- Clickable links for phone, fax, and email
- Responsive design
- Handles missing data gracefully (shows "NA" for missing values)
- Only shows mobile number if available and not "NA"

## Example Data

```typescript
const salesAgent: SalesAgent = {
  name: "John Doe",
  position: "Sales Representative",
  faxNumber: "+971 4 457 8271",
  phoneNumber: "+971 4 457 8271",
  email: "john.doe@company.com",
  mobNo1: "+971 50 123 4567"
};
```

## Styling

The component uses Bootstrap classes and includes custom SCSS styles. You can override the styles by targeting the `.sales-agent-sidebar` class.
