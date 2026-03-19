var __hermes_plugin__ = (function(exports, react) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	//#endregion
	react = __toESM(react);
	//#region node_modules/lucide-react/dist/esm/shared/src/utils.js
	/**
	* @license lucide-react v0.475.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
	var mergeClasses = (...classes) => classes.filter((className, index, array) => {
		return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
	}).join(" ").trim();
	//#endregion
	//#region node_modules/lucide-react/dist/esm/defaultAttributes.js
	/**
	* @license lucide-react v0.475.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var defaultAttributes = {
		xmlns: "http://www.w3.org/2000/svg",
		width: 24,
		height: 24,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round"
	};
	//#endregion
	//#region node_modules/lucide-react/dist/esm/Icon.js
	/**
	* @license lucide-react v0.475.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var Icon = (0, react.forwardRef)(({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
		return (0, react.createElement)("svg", {
			ref,
			...defaultAttributes,
			width: size,
			height: size,
			stroke: color,
			strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
			className: mergeClasses("lucide", className),
			...rest
		}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
	});
	//#endregion
	//#region node_modules/lucide-react/dist/esm/createLucideIcon.js
	/**
	* @license lucide-react v0.475.0 - ISC
	*
	* This source code is licensed under the ISC license.
	* See the LICENSE file in the root directory of this source tree.
	*/
	var createLucideIcon = (iconName, iconNode) => {
		const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
			ref,
			iconNode,
			className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
			...props
		}));
		Component.displayName = `${iconName}`;
		return Component;
	};
	var CalendarClock = createLucideIcon("CalendarClock", [
		["path", {
			d: "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",
			key: "1osxxc"
		}],
		["path", {
			d: "M16 2v4",
			key: "4m81vk"
		}],
		["path", {
			d: "M8 2v4",
			key: "1cmpym"
		}],
		["path", {
			d: "M3 10h5",
			key: "r794hk"
		}],
		["path", {
			d: "M17.5 17.5 16 16.3V14",
			key: "akvzfd"
		}],
		["circle", {
			cx: "16",
			cy: "16",
			r: "6",
			key: "qoo3c4"
		}]
	]);
	var Check = createLucideIcon("Check", [["path", {
		d: "M20 6 9 17l-5-5",
		key: "1gmf2c"
	}]]);
	var Clock = createLucideIcon("Clock", [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["polyline", {
		points: "12 6 12 12 16 14",
		key: "68esgv"
	}]]);
	var Copy = createLucideIcon("Copy", [["rect", {
		width: "14",
		height: "14",
		x: "8",
		y: "8",
		rx: "2",
		ry: "2",
		key: "17jyea"
	}], ["path", {
		d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
		key: "zix9uf"
	}]]);
	var SlidersHorizontal = createLucideIcon("SlidersHorizontal", [
		["line", {
			x1: "21",
			x2: "14",
			y1: "4",
			y2: "4",
			key: "obuewd"
		}],
		["line", {
			x1: "10",
			x2: "3",
			y1: "4",
			y2: "4",
			key: "1q6298"
		}],
		["line", {
			x1: "21",
			x2: "12",
			y1: "12",
			y2: "12",
			key: "1iu8h1"
		}],
		["line", {
			x1: "8",
			x2: "3",
			y1: "12",
			y2: "12",
			key: "ntss68"
		}],
		["line", {
			x1: "21",
			x2: "16",
			y1: "20",
			y2: "20",
			key: "14d8ph"
		}],
		["line", {
			x1: "12",
			x2: "3",
			y1: "20",
			y2: "20",
			key: "m0wm8r"
		}],
		["line", {
			x1: "14",
			x2: "14",
			y1: "2",
			y2: "6",
			key: "14e1ph"
		}],
		["line", {
			x1: "8",
			x2: "8",
			y1: "10",
			y2: "14",
			key: "1i6ji0"
		}],
		["line", {
			x1: "16",
			x2: "16",
			y1: "18",
			y2: "22",
			key: "1lctlv"
		}]
	]);
	var Zap = createLucideIcon("Zap", [["path", {
		d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
		key: "1xq2db"
	}]]);
	//#endregion
	//#region src/CronPanel.tsx
	var DEFAULT_CRON = {
		minute: "*",
		hour: "*",
		dayOfMonth: "*",
		month: "*",
		dayOfWeek: "*"
	};
	function fieldsToExpression(fields) {
		return `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`;
	}
	function expressionToFields(expr) {
		const parts = expr.trim().split(/\s+/);
		if (parts.length !== 5) return null;
		return {
			minute: parts[0],
			hour: parts[1],
			dayOfMonth: parts[2],
			month: parts[3],
			dayOfWeek: parts[4]
		};
	}
	function expandField(field, min, max) {
		try {
			const results = /* @__PURE__ */ new Set();
			const parts = field.split(",");
			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed === "*") for (let i = min; i <= max; i++) results.add(i);
				else if (trimmed.includes("/")) {
					const [rangePart, stepStr] = trimmed.split("/");
					const step = parseInt(stepStr, 10);
					if (isNaN(step) || step <= 0) return null;
					let start = min;
					let end = max;
					if (rangePart !== "*") if (rangePart.includes("-")) {
						const [a, b] = rangePart.split("-").map(Number);
						if (isNaN(a) || isNaN(b)) return null;
						start = a;
						end = b;
					} else {
						start = parseInt(rangePart, 10);
						if (isNaN(start)) return null;
						end = max;
					}
					for (let i = start; i <= end; i += step) results.add(i);
				} else if (trimmed.includes("-")) {
					const [a, b] = trimmed.split("-").map(Number);
					if (isNaN(a) || isNaN(b)) return null;
					for (let i = a; i <= b; i++) results.add(i);
				} else {
					const val = parseInt(trimmed, 10);
					if (isNaN(val)) return null;
					results.add(val);
				}
			}
			return Array.from(results).sort((a, b) => a - b);
		} catch {
			return null;
		}
	}
	function isValidCron(fields) {
		const minMax = [
			[0, 59],
			[0, 23],
			[1, 31],
			[1, 12],
			[0, 6]
		];
		const parts = [
			fields.minute,
			fields.hour,
			fields.dayOfMonth,
			fields.month,
			fields.dayOfWeek
		];
		for (let i = 0; i < 5; i++) if (expandField(parts[i], minMax[i][0], minMax[i][1]) === null) return false;
		return true;
	}
	var MONTH_NAMES = [
		"",
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	];
	var DAY_NAMES = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	];
	function describeField(field, min, max, names) {
		if (field === "*") return "";
		if (field.includes("/")) {
			const [rangePart, step] = field.split("/");
			if (rangePart === "*") return `every ${step}`;
			return `every ${step} from ${rangePart}`;
		}
		if (field.includes("-")) {
			const [a, b] = field.split("-");
			return `${names ? names[parseInt(a, 10)] || a : a} through ${names ? names[parseInt(b, 10)] || b : b}`;
		}
		if (field.includes(",")) return field.split(",").map((v) => {
			const n = parseInt(v.trim(), 10);
			return names ? names[n] || v.trim() : v.trim();
		}).join(", ");
		return names ? names[parseInt(field, 10)] || field : field;
	}
	function describeCron(fields) {
		const { minute, hour, dayOfMonth, month, dayOfWeek } = fields;
		if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") return "Every minute";
		const parts = [];
		if (minute.includes("/")) {
			const step = minute.split("/")[1];
			parts.push(`Every ${step} minute${step === "1" ? "" : "s"}`);
		} else if (minute === "*" && hour !== "*") parts.push("Every minute");
		else if (minute !== "*" && hour === "*") parts.push(`At minute ${describeField(minute, 0, 59)} of every hour`);
		else if (minute !== "*" && hour !== "*") {
			const mins = minute.padStart(2, "0");
			if (!hour.includes("/") && !hour.includes("-") && !hour.includes(",")) {
				const hrs = hour.padStart(2, "0");
				parts.push(`At ${hrs}:${mins}`);
			} else parts.push(`At minute ${mins}`);
		} else parts.push("Every minute");
		if (hour.includes("/")) {
			const step = hour.split("/")[1];
			parts.push(`past every ${step} hour${step === "1" ? "" : "s"}`);
		} else if (hour !== "*" && (minute === "*" || minute.includes("/"))) parts.push(`during hour ${describeField(hour, 0, 23)}`);
		if (dayOfWeek !== "*") {
			const desc = describeField(dayOfWeek, 0, 6, DAY_NAMES);
			parts.push(`on ${desc}`);
		}
		if (dayOfMonth !== "*") {
			const desc = describeField(dayOfMonth, 1, 31);
			parts.push(`on day ${desc} of the month`);
		}
		if (month !== "*") {
			const desc = describeField(month, 1, 12, MONTH_NAMES);
			parts.push(`in ${desc}`);
		}
		return parts.join(" ");
	}
	function getNextRuns(fields, count, from) {
		const runs = [];
		const start = from || /* @__PURE__ */ new Date();
		const minuteVals = expandField(fields.minute, 0, 59);
		const hourVals = expandField(fields.hour, 0, 23);
		const domVals = expandField(fields.dayOfMonth, 1, 31);
		const monthVals = expandField(fields.month, 1, 12);
		const dowVals = expandField(fields.dayOfWeek, 0, 6);
		if (!minuteVals || !hourVals || !domVals || !monthVals || !dowVals) return [];
		const minuteSet = new Set(minuteVals);
		const hourSet = new Set(hourVals);
		const domSet = new Set(domVals);
		const monthSet = new Set(monthVals);
		const dowSet = new Set(dowVals);
		const cursor = new Date(start);
		cursor.setSeconds(0, 0);
		cursor.setMinutes(cursor.getMinutes() + 1);
		const maxIterations = 2 * 365 * 24 * 60;
		let iterations = 0;
		while (runs.length < count && iterations < maxIterations) {
			const m = cursor.getMinutes();
			const h = cursor.getHours();
			const dom = cursor.getDate();
			const mon = cursor.getMonth() + 1;
			const dow = cursor.getDay();
			if (minuteSet.has(m) && hourSet.has(h) && domSet.has(dom) && monthSet.has(mon) && dowSet.has(dow)) runs.push(new Date(cursor));
			cursor.setMinutes(cursor.getMinutes() + 1);
			iterations++;
		}
		return runs;
	}
	function formatDate(d) {
		return `${[
			"Sun",
			"Mon",
			"Tue",
			"Wed",
			"Thu",
			"Fri",
			"Sat"
		][d.getDay()]}, ${[
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
		][d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	}
	function defaultFieldConfig(min, max) {
		return {
			mode: "every",
			specific: [min],
			rangeStart: min,
			rangeEnd: max,
			intervalStep: 1,
			intervalStart: min
		};
	}
	function fieldConfigToString(cfg) {
		switch (cfg.mode) {
			case "every": return "*";
			case "specific": return cfg.specific.length > 0 ? cfg.specific.join(",") : "*";
			case "range": return `${cfg.rangeStart}-${cfg.rangeEnd}`;
			case "interval": return `${cfg.intervalStart}/${cfg.intervalStep}`;
		}
	}
	function stringToFieldConfig(field, min, max) {
		const cfg = defaultFieldConfig(min, max);
		if (field === "*") {
			cfg.mode = "every";
			return cfg;
		}
		if (field.includes("/")) {
			cfg.mode = "interval";
			const [startPart, stepPart] = field.split("/");
			cfg.intervalStep = parseInt(stepPart, 10) || 1;
			if (startPart === "*") cfg.intervalStart = min;
			else cfg.intervalStart = parseInt(startPart, 10) || min;
			return cfg;
		}
		if (field.includes("-") && !field.includes(",")) {
			cfg.mode = "range";
			const [a, b] = field.split("-").map(Number);
			cfg.rangeStart = isNaN(a) ? min : a;
			cfg.rangeEnd = isNaN(b) ? max : b;
			return cfg;
		}
		cfg.mode = "specific";
		cfg.specific = field.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
		if (cfg.specific.length === 0) cfg.mode = "every";
		return cfg;
	}
	var PRESETS = [
		{
			label: "Every minute",
			expression: "* * * * *"
		},
		{
			label: "Every 5 minutes",
			expression: "*/5 * * * *"
		},
		{
			label: "Every 15 minutes",
			expression: "*/15 * * * *"
		},
		{
			label: "Every 30 minutes",
			expression: "*/30 * * * *"
		},
		{
			label: "Every hour",
			expression: "0 * * * *"
		},
		{
			label: "Every 6 hours",
			expression: "0 */6 * * *"
		},
		{
			label: "Daily at midnight",
			expression: "0 0 * * *"
		},
		{
			label: "Daily at noon",
			expression: "0 12 * * *"
		},
		{
			label: "Monday at 9:00 AM",
			expression: "0 9 * * 1"
		},
		{
			label: "Weekdays at 9:00 AM",
			expression: "0 9 * * 1-5"
		},
		{
			label: "First of month at midnight",
			expression: "0 0 1 * *"
		},
		{
			label: "Every Sunday at midnight",
			expression: "0 0 * * 0"
		}
	];
	var s = {
		root: {
			display: "flex",
			flexDirection: "column",
			height: "100%",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-lg)",
			color: "var(--text-0)",
			overflow: "hidden"
		},
		scrollArea: {
			flex: 1,
			overflow: "auto",
			padding: "10px 12px",
			display: "flex",
			flexDirection: "column",
			gap: "12px"
		},
		section: {
			display: "flex",
			flexDirection: "column",
			gap: "6px"
		},
		sectionTitle: {
			fontSize: "var(--text-sm)",
			color: "var(--text-2)",
			fontWeight: 600,
			textTransform: "uppercase",
			letterSpacing: "0.3px"
		},
		expressionRow: {
			display: "flex",
			alignItems: "center",
			gap: "6px"
		},
		input: {
			flex: 1,
			minWidth: 0,
			background: "var(--bg-2)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-0)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-lg)",
			padding: "6px 8px",
			outline: "none"
		},
		inputError: { borderColor: "var(--red, #f44)" },
		btn: {
			background: "var(--accent, var(--blue))",
			border: "none",
			borderRadius: "var(--radius)",
			color: "#fff",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-md)",
			fontWeight: 600,
			padding: "7px 12px",
			cursor: "pointer",
			whiteSpace: "nowrap"
		},
		btnSecondary: {
			background: "var(--bg-3)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-2)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-md)",
			fontWeight: 500,
			padding: "7px 12px",
			cursor: "pointer",
			whiteSpace: "nowrap"
		},
		description: {
			fontSize: "var(--text-base)",
			color: "var(--text-1)",
			padding: "8px 10px",
			background: "var(--bg-2)",
			borderRadius: "var(--radius)",
			lineHeight: "1.5"
		},
		fieldRow: {
			display: "flex",
			alignItems: "center",
			gap: "6px"
		},
		fieldLabel: {
			fontSize: "var(--text-sm)",
			color: "var(--text-2)",
			fontWeight: 600,
			minWidth: "70px",
			flexShrink: 0
		},
		select: {
			background: "var(--bg-2)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-0)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-sm)",
			padding: "4px 6px",
			outline: "none",
			cursor: "pointer"
		},
		fieldInput: {
			width: "50px",
			background: "var(--bg-2)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-0)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-sm)",
			padding: "4px 6px",
			outline: "none"
		},
		fieldSelectWide: {
			flex: 1,
			minWidth: 0,
			background: "var(--bg-2)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-0)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-sm)",
			padding: "4px 6px",
			outline: "none",
			cursor: "pointer"
		},
		presetGrid: {
			display: "flex",
			flexWrap: "wrap",
			gap: "4px"
		},
		presetBtn: {
			background: "var(--bg-2)",
			border: "1px solid var(--border)",
			borderRadius: "var(--radius)",
			color: "var(--text-1)",
			fontFamily: "var(--font-mono)",
			fontSize: "var(--text-xs)",
			padding: "4px 8px",
			cursor: "pointer",
			whiteSpace: "nowrap"
		},
		runItem: {
			fontSize: "var(--text-sm)",
			color: "var(--text-1)",
			fontFamily: "var(--font-mono)",
			padding: "3px 6px",
			borderRadius: "var(--radius-sm)",
			background: "var(--bg-2)"
		},
		runList: {
			display: "flex",
			flexDirection: "column",
			gap: "3px"
		},
		errorText: {
			fontSize: "var(--text-sm)",
			color: "var(--red, #f44)"
		},
		muted: {
			fontSize: "var(--text-xs)",
			color: "var(--text-3)"
		},
		inlineLabel: {
			fontSize: "var(--text-sm)",
			color: "var(--text-3)"
		}
	};
	function FieldBuilder({ label, min, max, config, onChange, names }) {
		const update = (partial) => {
			onChange({
				...config,
				...partial
			});
		};
		return /* @__PURE__ */ react.createElement("div", { style: s.fieldRow }, /* @__PURE__ */ react.createElement("span", { style: s.fieldLabel }, label), /* @__PURE__ */ react.createElement("select", {
			style: s.select,
			value: config.mode,
			onChange: (e) => {
				const mode = e.target.value;
				update({ mode });
			}
		}, /* @__PURE__ */ react.createElement("option", { value: "every" }, "Every"), /* @__PURE__ */ react.createElement("option", { value: "specific" }, "Specific"), /* @__PURE__ */ react.createElement("option", { value: "range" }, "Range"), /* @__PURE__ */ react.createElement("option", { value: "interval" }, "Interval")), config.mode === "specific" && /* @__PURE__ */ react.createElement("select", {
			style: s.fieldSelectWide,
			multiple: true,
			value: config.specific.map(String),
			onChange: (e) => {
				update({ specific: Array.from(e.target.selectedOptions).map((o) => parseInt(o.value, 10)) });
			},
			size: 1,
			title: "Hold Ctrl/Cmd to select multiple"
		}, Array.from({ length: max - min + 1 }, (_, i) => {
			const val = min + i;
			const display = names ? names[val] || String(val) : String(val);
			return /* @__PURE__ */ react.createElement("option", {
				key: val,
				value: String(val)
			}, display);
		})), config.mode === "range" && /* @__PURE__ */ react.createElement(react.Fragment, null, /* @__PURE__ */ react.createElement("input", {
			style: s.fieldInput,
			type: "number",
			min,
			max,
			value: config.rangeStart,
			onChange: (e) => update({ rangeStart: parseInt(e.target.value, 10) || min })
		}), /* @__PURE__ */ react.createElement("span", { style: s.inlineLabel }, "to"), /* @__PURE__ */ react.createElement("input", {
			style: s.fieldInput,
			type: "number",
			min,
			max,
			value: config.rangeEnd,
			onChange: (e) => update({ rangeEnd: parseInt(e.target.value, 10) || max })
		})), config.mode === "interval" && /* @__PURE__ */ react.createElement(react.Fragment, null, /* @__PURE__ */ react.createElement("span", { style: s.inlineLabel }, "every"), /* @__PURE__ */ react.createElement("input", {
			style: s.fieldInput,
			type: "number",
			min: 1,
			max: max - min + 1,
			value: config.intervalStep,
			onChange: (e) => update({ intervalStep: parseInt(e.target.value, 10) || 1 })
		}), /* @__PURE__ */ react.createElement("span", { style: s.inlineLabel }, "from"), /* @__PURE__ */ react.createElement("input", {
			style: s.fieldInput,
			type: "number",
			min,
			max,
			value: config.intervalStart,
			onChange: (e) => update({ intervalStart: parseInt(e.target.value, 10) || min })
		})));
	}
	var FIELD_DEFS = [
		{
			key: "minute",
			label: "Minute",
			min: 0,
			max: 59
		},
		{
			key: "hour",
			label: "Hour",
			min: 0,
			max: 23
		},
		{
			key: "dayOfMonth",
			label: "Day (M)",
			min: 1,
			max: 31
		},
		{
			key: "month",
			label: "Month",
			min: 1,
			max: 12,
			names: MONTH_NAMES
		},
		{
			key: "dayOfWeek",
			label: "Day (W)",
			min: 0,
			max: 6,
			names: DAY_NAMES
		}
	];
	function CronPanel() {
		const [fields, setFields] = react.useState({ ...DEFAULT_CRON });
		const [textInput, setTextInput] = react.useState("* * * * *");
		const [copied, setCopied] = react.useState(false);
		const [builderConfigs, setBuilderConfigs] = react.useState(() => ({
			minute: defaultFieldConfig(0, 59),
			hour: defaultFieldConfig(0, 23),
			dayOfMonth: defaultFieldConfig(1, 31),
			month: defaultFieldConfig(1, 12),
			dayOfWeek: defaultFieldConfig(0, 6)
		}));
		const syncSource = react.useRef(null);
		const handleTextChange = react.useCallback((value) => {
			setTextInput(value);
			const parsed = expressionToFields(value);
			if (parsed && isValidCron(parsed)) {
				syncSource.current = "text";
				setFields(parsed);
				setBuilderConfigs({
					minute: stringToFieldConfig(parsed.minute, 0, 59),
					hour: stringToFieldConfig(parsed.hour, 0, 23),
					dayOfMonth: stringToFieldConfig(parsed.dayOfMonth, 1, 31),
					month: stringToFieldConfig(parsed.month, 1, 12),
					dayOfWeek: stringToFieldConfig(parsed.dayOfWeek, 0, 6)
				});
			}
		}, []);
		const handleBuilderChange = react.useCallback((key, cfg) => {
			syncSource.current = "builder";
			setBuilderConfigs((prev) => ({
				...prev,
				[key]: cfg
			}));
			setFields((prev) => {
				const updated = {
					...prev,
					[key]: fieldConfigToString(cfg)
				};
				setTextInput(fieldsToExpression(updated));
				return updated;
			});
		}, []);
		const handlePreset = react.useCallback((expression) => {
			handleTextChange(expression);
		}, [handleTextChange]);
		const handleCopy = react.useCallback(async () => {
			const expr = fieldsToExpression(fields);
			try {
				const api = getAPI();
				await api.clipboard.writeText(expr);
				setCopied(true);
				api.ui.showToast("Cron expression copied to clipboard", {
					type: "success",
					duration: 1500
				});
				setTimeout(() => setCopied(false), 1500);
			} catch {}
		}, [fields]);
		const expression = fieldsToExpression(fields);
		const valid = isValidCron(fields);
		const description = valid ? describeCron(fields) : "";
		const nextRuns = valid ? getNextRuns(fields, 5) : [];
		const textParsed = expressionToFields(textInput);
		const textValid = textParsed !== null && isValidCron(textParsed);
		const textMismatch = textInput.trim() !== expression;
		return /* @__PURE__ */ react.createElement("div", { style: s.root }, /* @__PURE__ */ react.createElement("div", { style: s.scrollArea }, /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: {
			...s.sectionTitle,
			display: "flex",
			alignItems: "center",
			gap: "5px"
		} }, /* @__PURE__ */ react.createElement(Clock, { size: 13 }), " Expression"), /* @__PURE__ */ react.createElement("div", { style: s.expressionRow }, /* @__PURE__ */ react.createElement("input", {
			style: {
				...s.input,
				...textInput.trim() !== "" && !textValid && textMismatch ? s.inputError : {}
			},
			value: textInput,
			onChange: (e) => handleTextChange(e.target.value),
			placeholder: "* * * * *",
			spellCheck: false
		}), /* @__PURE__ */ react.createElement("button", {
			style: {
				...s.btn,
				display: "flex",
				alignItems: "center",
				gap: "4px"
			},
			onClick: handleCopy,
			title: "Copy expression"
		}, copied ? /* @__PURE__ */ react.createElement(Check, { size: 14 }) : /* @__PURE__ */ react.createElement(Copy, { size: 14 }), copied ? "Copied!" : "Copy")), /* @__PURE__ */ react.createElement("div", { style: s.muted }, "minute hour day(month) month day(week)")), valid && /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: s.sectionTitle }, "Description"), /* @__PURE__ */ react.createElement("div", { style: s.description }, description)), /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: {
			...s.sectionTitle,
			display: "flex",
			alignItems: "center",
			gap: "5px"
		} }, /* @__PURE__ */ react.createElement(SlidersHorizontal, { size: 13 }), " Visual Builder"), FIELD_DEFS.map((fd) => /* @__PURE__ */ react.createElement(FieldBuilder, {
			key: fd.key,
			label: fd.label,
			min: fd.min,
			max: fd.max,
			config: builderConfigs[fd.key],
			onChange: (cfg) => handleBuilderChange(fd.key, cfg),
			names: fd.names
		}))), /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: {
			...s.sectionTitle,
			display: "flex",
			alignItems: "center",
			gap: "5px"
		} }, /* @__PURE__ */ react.createElement(Zap, { size: 13 }), " Presets"), /* @__PURE__ */ react.createElement("div", { style: s.presetGrid }, PRESETS.map((p) => /* @__PURE__ */ react.createElement("button", {
			key: p.expression,
			style: {
				...s.presetBtn,
				...expression === p.expression ? {
					borderColor: "var(--accent, var(--blue))",
					color: "var(--accent, var(--blue))"
				} : {}
			},
			onClick: () => handlePreset(p.expression),
			title: p.expression
		}, p.label)))), valid && /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: {
			...s.sectionTitle,
			display: "flex",
			alignItems: "center",
			gap: "5px"
		} }, /* @__PURE__ */ react.createElement(CalendarClock, { size: 13 }), " Next 5 Runs"), nextRuns.length > 0 ? /* @__PURE__ */ react.createElement("div", { style: s.runList }, nextRuns.map((run, i) => /* @__PURE__ */ react.createElement("div", {
			key: i,
			style: s.runItem
		}, formatDate(run)))) : /* @__PURE__ */ react.createElement("div", { style: s.muted }, "No upcoming runs found in the next 2 years")), !valid && textInput.trim() !== "" && /* @__PURE__ */ react.createElement("div", { style: s.section }, /* @__PURE__ */ react.createElement("span", { style: s.errorText }, "Invalid cron expression"))));
	}
	//#endregion
	//#region src/activate.ts
	var hermesAPI = null;
	function getAPI() {
		if (!hermesAPI) throw new Error("Cron Builder plugin not activated");
		return hermesAPI;
	}
	function activate(api) {
		hermesAPI = api;
		api.ui.registerPanel("cron-builder-panel", CronPanel);
		api.subscriptions.push(api.commands.register("cron-builder.open", () => {
			api.ui.showPanel("cron-builder-panel");
		}));
	}
	function deactivate() {
		hermesAPI = null;
	}
	//#endregion
	exports.activate = activate;
	exports.deactivate = deactivate;
	exports.getAPI = getAPI;
	return exports;
})({}, React);
if (typeof window !== "undefined") {
	window.__hermesPlugins = window.__hermesPlugins || {};
	window.__hermesPlugins["hermes-hq.cron-builder"] = {
		activate: __hermes_plugin__.activate,
		deactivate: __hermes_plugin__.deactivate
	};
}
