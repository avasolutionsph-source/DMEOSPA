# Modular CSS Architecture

This directory contains the modular CSS architecture for the Ava Solutions PWA. The styles are organized into logical, maintainable files.

## File Structure

```
css/
├── main.css           # Main import file
├── variables.css      # CSS custom properties and design tokens
├── base.css          # Reset and base typography
├── layout.css        # Application layout and grid systems
├── navigation.css    # Navigation and sidebar components
├── buttons.css       # Button components and variants
├── forms.css         # Form controls and validation states
├── components.css    # Reusable UI components
├── dashboard.css     # Dashboard-specific styles
├── auth.css          # Authentication components
├── utilities.css     # Utility classes
└── README.md         # This file
```

## Architecture Benefits

### 🎯 **Maintainability**
- Easy to locate specific styles
- Changes isolated to relevant files
- Reduced risk of unintended side effects

### ⚡ **Performance**
- Smaller file sizes for specific features
- Better caching strategies
- Faster development builds

### 👥 **Team Collaboration**
- Clear separation of concerns
- Reduced merge conflicts
- Easier code reviews

### 🔍 **Debugging**
- Faster identification of style sources
- Clear naming conventions
- Logical organization

## File Descriptions

### **variables.css**
Contains all CSS custom properties including:
- Color palette (primary, secondary, semantic colors)
- Typography scales and weights
- Spacing system
- Border radius values
- Box shadows
- Transitions and animations
- Z-index scale

### **base.css**
Foundation styles including:
- CSS reset and normalization
- Base typography styles
- Accessibility foundations
- Global element styles

### **layout.css**
Application structure:
- Sidebar and main content layout
- Page containers and headers
- Responsive grid systems
- Mobile navigation

### **navigation.css**
Navigation components:
- Sidebar navigation styles
- Navigation items and states
- Logo and branding
- Mobile menu toggle

### **buttons.css**
Button system:
- Base button styles
- Button variants (primary, secondary, etc.)
- Button sizes (xs, sm, lg, xl)
- Button states and interactions
- Icon buttons and groups

### **forms.css**
Form components:
- Form layouts and groups
- Input field styles
- Form validation states
- Checkboxes, radio buttons, switches
- File upload components

### **components.css**
Reusable UI components:
- Cards and containers
- Modals and overlays
- Alerts and notifications
- Badges and labels
- Progress bars
- Tooltips

### **dashboard.css**
Dashboard-specific styles:
- Dashboard grid layouts
- Statistics cards
- Charts and data visualization
- Activity feeds
- Metrics display

### **auth.css**
Authentication components:
- Login/signup forms
- Authentication indicators
- User profile components
- Social authentication buttons

### **utilities.css**
Utility classes for rapid development:
- Spacing utilities (margin, padding)
- Typography utilities
- Display and flexbox utilities
- Color and background utilities
- Border and shadow utilities

## Usage Guidelines

### **Import Order**
The main.css file imports styles in this order:
1. Variables and design tokens
2. Base styles and reset
3. Layout and structure
4. Navigation components
5. Form and button components
6. General UI components
7. Page-specific styles
8. Utility classes

### **CSS Custom Properties**
Use CSS custom properties from variables.css:
```css
.my-component {
    color: var(--primary-color);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
}
```

### **Utility Classes**
Use utility classes for common styles:
```html
<div class="flex items-center gap-4 p-4 rounded-lg shadow-md">
    <button class="btn btn-primary">Save</button>
</div>
```

### **Component Naming**
Follow BEM methodology for new components:
```css
.component-name { /* Block */ }
.component-name__element { /* Element */ }
.component-name--modifier { /* Modifier */ }
```

## Development Workflow

### **Adding New Styles**
1. Determine the appropriate file for your styles
2. Use existing design tokens when possible
3. Follow the established naming conventions
4. Test across different screen sizes

### **Modifying Variables**
- Update variables.css for global changes
- Test impact across all components
- Consider semantic meaning of changes

### **Creating New Components**
1. Add to the appropriate CSS file
2. Use consistent naming patterns
3. Include responsive styles
4. Document any special usage requirements

## Browser Support

The CSS architecture supports:
- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+)
- CSS Grid and Flexbox
- CSS Custom Properties
- Modern CSS features (backdrop-filter, etc.)

## Performance Considerations

- Use CSS custom properties for consistency
- Minimize use of !important
- Prefer CSS Grid and Flexbox over floats
- Use efficient selectors
- Leverage utility classes for common patterns

## Maintenance

### **Regular Tasks**
- Remove unused styles periodically
- Update design tokens as design evolves
- Ensure responsive styles work across devices
- Validate color contrast and accessibility

### **Code Quality**
- Use consistent indentation (2 spaces)
- Group related properties together
- Comment complex calculations or hacks
- Follow established naming conventions

This modular architecture provides a solid foundation for maintaining and scaling the PWA's styling system.