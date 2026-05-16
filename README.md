# 📋 EduTrack — Student Attendance Management System

A fully offline, browser-based student attendance tracker built with pure HTML, CSS, and JavaScript. No server, no database, no build step required.

---

## ✨ Features

### Student Management
- Add, edit, and delete students
- Import students from CSV
- Export student list to CSV
- Search students by name
- Duplicate name prevention

### Attendance Marking
- Select any date from 2026–2030
- Mark students as **Present**, **Absent**, **Late**, or **Excused**
- Mark all students at once with bulk actions
- Reset a day's attendance
- Auto-save to `localStorage`

### Dashboard
- Daily summary: Present / Absent / Late / Excused counts
- Class attendance percentage
- Doughnut chart (today's breakdown)
- Monthly trend bar chart
- Low attendance warnings (below 80%)

### Analytics
- Filter by year, month, and student
- Individual per-student stats (totals + percentage)
- Yearly performance line chart
- Student comparison horizontal bar chart
- Progress bars with colour-coded health

### Reports & Export
- Export daily, monthly, yearly, or full dataset to CSV
- Backup entire database as JSON
- Restore from JSON backup
- Print report

### UI / UX
- Responsive layout (desktop, tablet, mobile)
- Dark mode toggle
- Toast notifications
- Student ranking leaderboard

---

## 🚀 Deployment on GitHub Pages

### Method 1 — Direct Upload

1. Create a new GitHub repository (e.g. `student-attendance`).
2. Upload the three files:
   - `index.html`
   - `style.css`
   - `script.js`
3. Go to **Settings → Pages**.
4. Under **Source**, select `Deploy from a branch`.
5. Choose `main` branch and `/ (root)` folder, then click **Save**.
6. After ~1 minute, your site will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

### Method 2 — Git CLI

```bash
# Clone or create your repo
git clone https://github.com/<your-username>/student-attendance.git
cd student-attendance

# Copy the three project files into this directory, then:
git add index.html style.css script.js README.md
git commit -m "Initial EduTrack release"
git push origin main

# Enable GitHub Pages in Settings → Pages (Branch: main, Folder: /)
```

### Method 3 — GitHub CLI

```bash
gh repo create student-attendance --public --source=. --push
# Then enable Pages in Settings → Pages
```

---

## 📁 File Structure

```
student-attendance/
├── index.html      # Main HTML shell + layout
├── style.css       # All styling (CSS variables, responsive, dark mode)
├── script.js       # All logic (data, rendering, charts, CSV, backup)
└── README.md       # This file
```

---

## 🗄 Data Format (localStorage)

All data is stored under the key `edutrack_data`:

```json
{
  "students": [
    { "id": 1, "name": "Alice Johnson" },
    { "id": 2, "name": "Bob Martinez" }
  ],
  "attendance": {
    "2026-01-15": {
      "1": "Present",
      "2": "Absent"
    },
    "2026-01-16": {
      "1": "Late",
      "2": "Present"
    }
  }
}
```

---

## 💻 Running Locally

No build tools needed. Just open `index.html` directly in a browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Or serve with any static server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

---

## 🎨 Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Markup      | HTML5                             |
| Styling     | CSS3 (Custom Properties, Grid, Flexbox) |
| Logic       | Vanilla JavaScript (ES6+)         |
| Charts      | [Chart.js 4](https://www.chartjs.org/) via CDN |
| Fonts       | [Google Fonts](https://fonts.google.com/) — Syne + DM Sans |
| Storage     | Browser `localStorage`            |

---

## ⚠ Limitations

- Data lives in `localStorage` — it is **device-specific**. Use the **Backup/Restore** feature to transfer data between devices.
- `localStorage` is typically capped at ~5 MB per origin. For very large rosters over many years, monitor storage usage.
- No multi-user or cloud sync support.

---

## 🛠 Extending the System

The codebase is modular and easy to extend:

- **Add a new status** — update the `STATUSES` constant in `script.js` and add a matching CSS badge class in `style.css`.
- **Add more years** — update the `YEARS` array in `script.js`.
- **Connect a backend** — replace `saveData()` / `loadData()` with `fetch()` calls to any REST API.
- **Add authentication** — wrap the `body` content in a login gate before calling `loadData()`.

---

## 📄 License

MIT — free to use, modify, and distribute.
