# Mobile Testing Guide

## Quick Test Checklist

### 📱 Mobile Devices (< 640px)

#### iPhone SE (375px width) - Minimum Size
```
✓ Landing Page
  □ Header fits without overflow
  □ Hero text is readable
  □ Buttons are full-width and tappable
  □ Feature cards stack vertically
  
✓ Authentication
  □ Login form inputs are properly sized
  □ Register form doesn't overflow
  □ Submit buttons are easily tappable
  
✓ Dashboards
  □ Stats cards stack vertically
  □ Campaign/invitation cards are readable
  □ Action buttons are touch-friendly
  □ Dialogs fit on screen
```

#### iPhone 12/13/14 (390px width) - Common Size
```
✓ All pages render properly
✓ No horizontal scrolling
✓ Text is comfortable to read
✓ Buttons have proper spacing
```

#### iPhone 14 Pro Max (430px width) - Large Phone
```
✓ Content utilizes available space
✓ Not too much whitespace
✓ Layout remains mobile-optimized
```

---

### 📱 Tablet Devices (640px - 1024px)

#### iPad Mini (768px width)
```
✓ Landing Page
  □ 2-column feature grid displays
  □ Header shows all elements
  □ Hero section well-balanced
  
✓ Dashboards
  □ 2-column stats cards
  □ Campaign lists show more info
  □ Settings button shows text
```

#### iPad Pro (1024px width)
```
✓ Desktop layout begins
✓ 3-column grids appear
✓ Full navigation visible
✓ Optimal spacing
```

---

## Device Testing Matrix

| Device | Width | Height | Test Status | Notes |
|--------|-------|--------|-------------|-------|
| iPhone SE | 375px | 667px | ✓ Pass | Minimum size |
| iPhone 12 | 390px | 844px | ✓ Pass | Most common |
| iPhone 14 Pro Max | 430px | 932px | ✓ Pass | Large phone |
| Samsung Galaxy S21 | 360px | 800px | ⏳ Pending | Android |
| iPad Mini | 768px | 1024px | ⏳ Pending | Small tablet |
| iPad Pro | 1024px | 1366px | ⏳ Pending | Large tablet |
| Desktop | 1920px | 1080px | ✓ Pass | Desktop view |

---

## Testing Scenarios

### 1. Landing Page Test

**Mobile (< 640px)**
- [ ] Open homepage on mobile browser
- [ ] Scroll through entire page
- [ ] Verify no horizontal scroll appears
- [ ] Tap "Register" button → should navigate smoothly
- [ ] Check hero text is readable without zooming
- [ ] Verify feature cards stack nicely

**Tablet (640px - 1024px)**
- [ ] Open homepage on tablet
- [ ] Check 2-column feature grid displays
- [ ] Verify spacing looks good
- [ ] Tap navigation elements

**Desktop (> 1024px)**
- [ ] Open homepage on desktop
- [ ] Verify 3-column feature grid
- [ ] Check all hover effects work
- [ ] Verify no wasted space

---

### 2. Registration Flow Test

**Mobile**
1. Navigate to register page
2. Fill in all fields:
   - [ ] Full name input accessible
   - [ ] Email input shows keyboard
   - [ ] Phone input shows number pad
   - [ ] Password fields are secure
   - [ ] Role selection radio buttons are tappable
3. Submit form:
   - [ ] Button is easy to tap
   - [ ] Loading state shows clearly
   - [ ] Success navigation works

**Test Data:**
```
Full Name: Test User
Email: test@example.com
Phone: +966 50 123 4567
Password: Test123!
Role: Owner (for auto-approval test)
```

---

### 3. Dashboard Test (Owner)

**Mobile**
1. Login as owner
2. Check dashboard:
   - [ ] Stats cards stack vertically
   - [ ] Numbers are readable
   - [ ] "Create Campaign" button is full-width
   - [ ] Campaign list items are tappable
   - [ ] Settings icon is visible and tappable

**Tablet**
1. Login as owner
2. Check dashboard:
   - [ ] Stats cards in 2-column grid
   - [ ] Settings button shows text
   - [ ] Campaign cards show more details
   - [ ] Logout button accessible

---

### 4. Dashboard Test (Influencer)

**Mobile**
1. Login as influencer (approved account)
2. Check dashboard:
   - [ ] Stats cards visible
   - [ ] Invitation cards render properly
   - [ ] Business names don't overflow
   - [ ] Location info is readable
   - [ ] Price/hospitality badges fit
   - [ ] Action buttons are stacked vertically
   - [ ] "Details" button works
   - [ ] "Accept" and "Reject" buttons are easily tappable

3. Open campaign details dialog:
   - [ ] Dialog fits on screen (95% width)
   - [ ] Content is scrollable
   - [ ] All info is readable
   - [ ] Close button works
   - [ ] Action buttons accessible

4. Test proof upload:
   - [ ] Upload dialog fits screen
   - [ ] URL input is accessible
   - [ ] Keyboard doesn't cover input
   - [ ] Submit button works

---

## Touch Target Testing

### Minimum Size Requirements (WCAG 2.5.5)
All interactive elements should be **at least 44x44px**

**Elements to Test:**
- [ ] Login button: ≥44px height ✓
- [ ] Register button: ≥44px height ✓
- [ ] Accept invitation button: ≥44px height ✓
- [ ] Reject invitation button: ≥44px height ✓
- [ ] Settings icon button: ≥44px tap area ✓
- [ ] Logout button: ≥44px height ✓
- [ ] Dialog close buttons: ≥44px ✓

---

## Text Readability Testing

### Font Size Requirements
- Body text: ≥16px on mobile ✓
- Headings: Appropriately scaled ✓
- Small text: ≥12px (for labels) ✓

**Check These:**
- [ ] Campaign titles are readable
- [ ] Descriptions don't require zooming
- [ ] Stats numbers are clear
- [ ] Button text is legible
- [ ] Form labels are visible

---

## Browser Testing

### iOS Safari (Priority 1)
- [ ] iPhone SE (oldest supported)
- [ ] iPhone 12 (most common)
- [ ] iPhone 14 Pro (newest)
- [ ] iPad (landscape & portrait)

**Known Issues:**
- Viewport height on iOS Safari (address bar)
- Touch events vs click events

### Chrome Mobile (Priority 2)
- [ ] Android phone (360px width)
- [ ] Android tablet
- [ ] Different manufacturers (Samsung, Pixel)

### Samsung Internet (Priority 3)
- [ ] Samsung Galaxy device
- [ ] Check for any rendering differences

---

## Performance Testing

### Mobile Network Simulation
1. Open Chrome DevTools
2. Network tab → Slow 3G
3. Test:
   - [ ] Page loads in < 5 seconds
   - [ ] Images load progressively
   - [ ] Interaction is still smooth
   - [ ] No layout shifts

### Mobile CPU Simulation
1. Chrome DevTools → Performance
2. CPU: 6x slowdown
3. Test:
   - [ ] Animations are smooth
   - [ ] Scrolling doesn't lag
   - [ ] Form inputs are responsive

---

## Orientation Testing

### Portrait Mode (Primary)
- [ ] Landing page
- [ ] Login/Register
- [ ] Owner dashboard
- [ ] Influencer dashboard
- [ ] Dialogs

### Landscape Mode (Secondary)
- [ ] Layout adapts properly
- [ ] No content cutoff
- [ ] Navigation accessible
- [ ] Forms still usable

**Test on:**
- iPhone (landscape)
- iPad (landscape)
- Android (landscape)

---

## Accessibility Testing

### Screen Reader
- [ ] VoiceOver (iOS) reads all content
- [ ] TalkBack (Android) navigates properly
- [ ] Buttons have proper labels
- [ ] Form inputs have labels

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Enter/Space activate buttons

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Buttons have sufficient contrast
- [ ] Links are distinguishable
- [ ] Error messages are clear

---

## Common Issues to Check

### Layout Issues
- [ ] No horizontal scrolling
- [ ] No content overflow
- [ ] No overlapping elements
- [ ] Proper spacing between elements

### Interactive Issues
- [ ] All buttons are tappable
- [ ] No accidental taps on close elements
- [ ] Dropdowns work on touch
- [ ] Dialogs can be dismissed

### Form Issues
- [ ] Keyboard shows correct type (email, number, tel)
- [ ] Zoom doesn't break layout
- [ ] Submit button doesn't hide under keyboard
- [ ] Validation messages visible

### Dialog Issues
- [ ] Fits on screen without scrolling dialog itself
- [ ] Close button accessible
- [ ] Content scrollable if needed
- [ ] Background dimmed properly

---

## Browser DevTools Testing

### Chrome DevTools
```
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select devices:
   - iPhone SE
   - iPhone 12 Pro
   - Pixel 5
   - iPad
   - iPad Pro
4. Test in each resolution
5. Test touch simulation
6. Check responsive mode
```

### Firefox DevTools
```
1. Open DevTools (F12)
2. Click Responsive Design Mode (Ctrl+Shift+M)
3. Test different screen sizes
4. Check touch simulation
```

### Safari DevTools
```
1. Enable Developer menu (Preferences → Advanced)
2. Develop → Enter Responsive Design Mode
3. Test iOS devices
4. Test in actual Safari on iPhone
```

---

## Test Report Template

```markdown
## Mobile Test Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Platform:** [iOS/Android/Both]

### Devices Tested
- [ ] iPhone SE (375px)
- [ ] iPhone 12 (390px)
- [ ] iPad (768px)
- [ ] Android Phone (360px)

### Pages Tested
- [ ] Landing ✓/✗
- [ ] Login ✓/✗
- [ ] Register ✓/✗
- [ ] Owner Dashboard ✓/✗
- [ ] Influencer Dashboard ✓/✗

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Device: [Device name]
   - Steps to reproduce: ...
   - Screenshot: [attach]

### Overall Status
✓ Pass / ⚠️ Minor Issues / ✗ Fail

### Notes
[Additional comments]
```

---

## Quick Commands

### Test Local Build on Mobile

**Using ngrok (recommended):**
```bash
# Install ngrok
npm install -g ngrok

# Start dev server
npm run dev

# In another terminal, expose to internet
ngrok http 5173

# Copy URL and test on real device
```

**Using local IP:**
```bash
# Start dev server with host flag
npm run dev -- --host

# Visit http://[your-ip]:5173 on mobile
# Must be on same WiFi network
```

---

## Final Checklist Before Deployment

- [ ] All core pages tested on iPhone
- [ ] All core pages tested on Android
- [ ] No console errors on mobile browsers
- [ ] Touch targets meet 44px minimum
- [ ] Text is readable without zoom
- [ ] Forms work properly
- [ ] Dialogs fit on screen
- [ ] No horizontal scroll anywhere
- [ ] Loading states are clear
- [ ] Error messages are visible
- [ ] Success feedback works
- [ ] Navigation is intuitive
- [ ] Performance is acceptable

---

**Last Updated:** December 13, 2025

