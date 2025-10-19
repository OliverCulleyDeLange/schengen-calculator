# Schengen Calculator

A free-forever Schengen days calculator to track your 90/180 day visa-free visits to the Schengen Area.

## Features

- 📅 **Interactive Calendar**: Click-based date range selection - click a start date, then an end date
- 🔄 **90/180 Day Tracking**: Automatically calculates days used in any rolling 180-day window
- ⚠️ **Overstay Warnings**: Visual alerts when you exceed the 90-day limit
- 💾 **Auto-Save**: Your date ranges are automatically saved using IndexedDB
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Beautiful UI**: Modern gradient design with intuitive controls

## Usage

Simply open `index.html` in your web browser. No installation or build process required!

### Adding Date Ranges

1. **Click Method** (Recommended): 
   - Click on a date to start a range
   - Click on another date to complete the range
   - Your range is automatically saved

2. **Manual Entry**: 
   - Click the "Add Date Range" button
   - Enter dates in YYYY-MM-DD format

### Managing Ranges

- **Delete Individual Range**: Click the red "Delete" button next to any range
- **Clear All**: Click "Clear All Dates" to remove all ranges at once

### Understanding the Display

- **Purple Boxes**: Show days used and remaining in the current 180-day window
- **Red Warning Box**: Appears when you exceed 90 days
- **Blue Highlighted Dates**: Days within your selected ranges
- **Red Highlighted Dates**: Days that cause you to exceed the 90-day limit
- **Yellow Border**: Today's date

## Technical Details

Built with pure HTML, CSS, and JavaScript - no frameworks or dependencies required.

- **Storage**: Uses IndexedDB for persistent local storage
- **Calculation**: Implements proper rolling 180-day window logic
- **Browser Support**: Works in all modern browsers with IndexedDB support
- **Analytics**: Privacy-friendly GoatCounter analytics for tracking app usage

## License

Free to use and modify. 
