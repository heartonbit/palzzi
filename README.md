# 🎀 Palzzi - 쿠미히모 시뮬레이터

A web-based Kumihimo (braiding) simulator that visualizes the process of creating round braids on a 32-slot disk.

## Features

- **Interactive Disk View**: Visualize thread positions on a 32-slot round disk
- **Playback Controls**: Step through the braiding process with play/pause/step controls
- **Pattern Chart View**: See the woven pattern as a 2D color chart
- **Finished Preview**: View the completed braid as it's being woven
- **Template Library**: Pre-defined color patterns for different thread counts
- **Export**: Save your pattern as PNG, SVG, or JSON
- **Save/Load**: Save your project locally and resume later
- **Share**: Generate shareable URLs with your pattern configuration

## Supported Thread Counts

- 4 threads (2 pairs)
- 8 threads (4 pairs) - recommended for beginners
- 12 threads (6 pairs)
- 16 threads (8 pairs)

## Installation

```bash
# Clone the repository
git clone https://github.com/heartonbit/palzzi.git
cd palzzi

# No build step required - just serve the files
npm install
npm start
```

The application will be available at `http://localhost:3000`.

Alternatively, use any HTTP server:

```bash
# Using Python
python3 -m http.server 3000

# Using Node.js
npx serve .
```

## Usage

1. **Select a Template**: Choose from pre-defined color patterns in the left panel
2. **Adjust Thread Count**: Change the number of threads using the buttons
3. **Customize Colors**: Click on thread swatches and use the color picker to change colors
4. **Weave**: Use the playback controls (▶) to step through the braiding process
5. **Export**: Save your design as PNG, SVG, or JSON

### Controls

| Button | Key | Action |
|--------|-----|--------|
| ⏮ | Home | Go to first step |
| ◀ | ← | Previous step |
| ▶/⏸ | Space | Play/Pause |
| ▶ | → | Next step |
| ⏭ | End | Go to last step |

## Architecture

```
palzzi/
├── index.html          # Main HTML page
├── style.css           # Application styles
├── src/
│   ├── engine/
│   │   ├── kumihimo.js      # Core braiding algorithm (UI-independent)
│   │   └── kumihimo.test.js # Algorithm tests
│   ├── templates/
│   │   └── templates.js     # Pattern template library
│   └── main.js              # UI application logic
└── doc/                # Project documentation
```

The application follows a clean separation between the **engine layer** (braiding algorithm) and the **UI layer** (rendering and interaction), as specified in the PRD.

### Engine Layer (`src/engine/kumihimo.js`)

- `initDisk(colors)` - Initialize a 32-slot disk with thread colors
- `weaveRow(state)` - Perform one row of braiding
- `weaveRows(state, count)` - Perform multiple rows
- `snapshot(state)` / `restore(state, snap)` - State management for playback
- `getPatternChart(state)` - Get the woven pattern data

## Testing

```bash
npm test
```

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas API
- **Engine**: Pure JavaScript with zero dependencies
- **Storage**: Browser LocalStorage
- **Export**: Canvas to PNG, manual SVG generation, JSON export

## Future Enhancements

- 3D rendering with Three.js
- Custom pattern editor
- More craft types (Misanga, Macrame)
- User accounts and cloud storage
- Community gallery for sharing patterns

## License

MIT
