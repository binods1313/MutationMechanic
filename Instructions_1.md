Plan: fix four ARIA errors by standardizing boolean ARIA attributes and using appropriate elements.

File 1: GenomicAnnotationPanel.tsx

Issue: aria-pressed or aria-expanded values are not booleans or not on a suitable element.
Target blocks:
Look for aria-pressed usage
Look for aria-expanded usage
Example patch (adjust line numbers to match your file):

Before (example, lines 50-60):
50: <div onClick={togglePressed} aria-pressed={pressed ? "true" : "false"}>
51: Toggle
52: </div>

After (lines 50-53):
50: <button onClick={togglePressed} aria-pressed={pressed}>
51: Toggle
52: </button>

Before (example, lines 120-130):
120: <div className="panel" aria-expanded={isOpen ? "open" : "closed"}>
121: <Header />
122: </div>

After (lines 120-124):
120: <div className="panel" aria-expanded={isOpen}>
121: <Header />
122: </div>
123: // If you must keep a non-button toggle, wrap with a button element and use a boolean
124: // Or ensure isOpen is a boolean and the element has a role that makes sense.

Key checks:

aria-pressed should be boolean (true/false) on a button or role="button".
aria-expanded should be boolean on the collapsible region; ensure visibility mirrors isOpen.
Ensure no string "true"/"false" remains when you pass a boolean in JSX.
File 2: OrthologTable.tsx

Issue: aria-valuenow or incorrect boolean for expandable row or slider.
Target blocks:
Search for aria-expanded or aria-valuenow usage (likely in table rows or expandable sections)
Example patch (lines approximate):

Before (lines 40-45):
40: <tr aria-expanded={expanded ? "true" : "false"}>...</tr>

After (lines 40-42):
40: <tr aria-expanded={expanded}>...</tr>

If a slider/range is used:

Before (lines 60-66):
60: <div role="slider" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
61: ...
66: </div>
After (lines 60-66):
60: <input type="range" min={0} max={100} value={value} onChange={handleChange} />
61: ...
66:
Notes:
Prefer native input elements for sliders/ranges (type="range") to avoid complex ARIA states.

If keeping a div with role="slider", ensure aria-valuenow is a number, and aria-valuemin/max are numbers, and the value updates in sync.

File 3: ClinicalInterpretationPanel.tsx

Issue: aria-pressed or aria-expanded on non-interactive elements or with non-boolean values.
Target blocks:
aria-pressed on a toggle control
aria-expanded on a collapsible section
Patch example:

Before (aria-pressed on div, lines around 28-34):
28: <div onClick={handleClick} aria-pressed={pressed ? "true" : "false"}>
29: Interpret
30: </div>

After (lines 28-31):
28: <button onClick={handleClick} aria-pressed={pressed}>
29: Interpret
30: </button>

Before (lines 70-76, aria-expanded):
70: <div className="section" aria-expanded={open ? "open" : "closed"}>
71: Details
72: </div>

After (lines 70-72):
70: <div className="section" aria-expanded={open}>
71: Details
72: </div>

File 4: SplicingDecoderTable.tsx

Issue: aria-valuenow or aria-expanded misused in table/deck sections.
Target blocks:
Expandable row or header with aria-expanded
Any slider-like control with aria-valuenow
Patch example:

Before (lines 12-18):
12: <tr aria-expanded={isOpen ? "true" : "false"}>
13: ...
18: </tr>

After (lines 12-14):
12: <tr aria-expanded={isOpen}>
13: ...
14: </tr>

If a value indicator exists (lines around 40-46):
40: <div role="slider" aria-valuenow={sliderValue} aria-valuemin={0} aria-valuemax={100}>
41: ...
46: </div>

After (lines 40-41):
40: <input type="range" min={0} max={100} value={sliderValue} onChange={handleSlider} />
41:

General guidance you can hand off with exact line numbers:

Replace non-boolean ARIA attributes with proper booleans or use native elements.
If an element is interactive, prefer a native element (button, input, details/summary) and use ARIA to augment if needed.
Ensure all aria-valuenow, aria-valuemin, aria-valuemax are numbers and in-range.