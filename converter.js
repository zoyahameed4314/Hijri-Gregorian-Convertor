/**
 * Bidirectional Hijri-Gregorian Date Converter
 * Primary: Live Aladhan API (api.aladhan.com)
 * Fallback: Pure Mathematical Tabular Islamic Calendar (Civil Epoch, 1948440 JDN)
 */

const ISLAMIC_MONTHS = [
    "Al-Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

const GREGORIAN_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// --- FALLBACK MATHEMATICAL ENGINE ---

function gregorianToJdn(year, month, day) {
    let y = year;
    let m = month;
    if (m < 3) {
        y -= 1;
        m += 12;
    }
    let a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
}

function jdnToGregorian(jdn) {
    let l = jdn + 68569;
    let n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    let i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    let k = Math.floor((80 * l) / 2447);
    let d = l - Math.floor((2447 * k) / 80);
    let l_floor = Math.floor(k / 11);
    let m = k + 2 - 12 * l_floor;
    let y = 100 * (n - 49) + i + l_floor;
    return { year: y, month: m, day: d };
}

function hijriToJdn(year, month, day) {
    return Math.floor((11 * year + 3) / 30) + 354 * year + 30 * month - Math.floor((month - 1) / 2) + day + 1948440 - 385;
}

function jdnToHijri(jdn) {
    let l = jdn - 1948440 + 10632;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    let m = Math.floor((24 * l) / 709);
    let d = l - Math.floor((709 * m) / 24);
    let y = 30 * n + j - 30;
    return { year: y, month: m, day: d };
}

// --- API CLIENTS WITH FALLBACK ---

async function fetchGregorianToHijri(year, month, day) {
    const formattedDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    const url = `https://api.aladhan.com/v1/gToH?date=${formattedDate}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("API response error");
        const json = await response.data ? response : await response.json();
        const data = json.data;
        return {
            source: "API (Live)",
            day: parseInt(data.hijri.day),
            month: data.hijri.month.en,
            monthNum: data.hijri.month.number,
            year: parseInt(data.hijri.year)
        };
    } catch (error) {
        console.warn("Aladhan API failed. Falling back to offline mathematical conversion.", error);
        const jdn = gregorianToJdn(year, month, day);
        const hijri = jdnToHijri(jdn);
        return {
            source: "Mathematical Fallback (Offline)",
            day: hijri.day,
            month: ISLAMIC_MONTHS[hijri.month - 1],
            monthNum: hijri.month,
            year: hijri.year
        };
    }
}

async function fetchHijriToGregorian(year, month, day) {
    const formattedDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    const url = `https://api.aladhan.com/v1/hToG?date=${formattedDate}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("API response error");
        const json = await response.data ? response : await response.json();
        const data = json.data;
        return {
            source: "API (Live)",
            day: parseInt(data.gregorian.day),
            month: data.gregorian.month.en,
            year: parseInt(data.gregorian.year)
        };
    } catch (error) {
        console.warn("Aladhan API failed. Falling back to offline mathematical conversion.", error);
        const jdn = hijriToJdn(year, month, day);
        const greg = jdnToGregorian(jdn);
        return {
            source: "Mathematical Fallback (Offline)",
            day: greg.day,
            month: GREGORIAN_MONTHS[greg.month - 1],
            year: greg.year
        };
    }
}

// --- UI CONTROLLERS ---

document.addEventListener("DOMContentLoaded", () => {
    // Tab Switching Logic
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));
            
            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Populate Hijri Selects
    const hijriDaySelect = document.getElementById("hijri-day");
    const hijriMonthSelect = document.getElementById("hijri-month");
    const hijriYearSelect = document.getElementById("hijri-year");

    if (hijriDaySelect && hijriMonthSelect && hijriYearSelect) {
        for (let i = 1; i <= 30; i++) {
            hijriDaySelect.add(new Option(i, i));
        }

        ISLAMIC_MONTHS.forEach((month, index) => {
            hijriMonthSelect.add(new Option(month, index + 1));
        });

        // Populate years 1300 to 1600 AH
        for (let i = 1300; i <= 1600; i++) {
            hijriYearSelect.add(new Option(i, i));
        }
    }

    // Set Defaults
    const today = new Date();
    const gDateInput = document.getElementById("gregorian-date");
    if (gDateInput) {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        gDateInput.value = `${yyyy}-${mm}-${dd}`;
        
        // Initial Conversion calculation
        convertGregorianToHijri();
    }

    // Bind Event Listeners
    if (gDateInput) {
        gDateInput.addEventListener("input", convertGregorianToHijri);
        gDateInput.addEventListener("change", convertGregorianToHijri);
    }

    [hijriDaySelect, hijriMonthSelect, hijriYearSelect].forEach(select => {
        if (select) {
            select.addEventListener("input", convertHijriToGregorian);
            select.addEventListener("change", convertHijriToGregorian);
        }
    });
});

async function convertGregorianToHijri() {
    const dateVal = document.getElementById("gregorian-date").value;
    if (!dateVal) return;

    const [year, month, day] = dateVal.split("-").map(Number);
    const resultBox = document.getElementById("hijri-result");
    const sourceBadge = document.getElementById("hijri-source");

    resultBox.classList.add("loading-pulse");
    
    const result = await fetchGregorianToHijri(year, month, day);
    
    resultBox.classList.remove("loading-pulse");
    resultBox.innerHTML = `${result.day} ${result.month} ${result.year} AH`;
    
    if (sourceBadge) {
        sourceBadge.innerHTML = `Data Source: ${result.source}`;
    }
}

async function convertHijriToGregorian() {
    const day = parseInt(document.getElementById("hijri-day").value);
    const month = parseInt(document.getElementById("hijri-month").value);
    const year = parseInt(document.getElementById("hijri-year").value);

    if (!day || !month || !year) return;

    // Fast validate UI before request if we are doing offline fallback
    let maxDays = (month % 2 !== 0) ? 30 : 29;
    const isLeap = (11 * year + 14) % 30 < 11;
    if (month === 12 && isLeap) maxDays = 30;

    if (day > maxDays) {
        document.getElementById("gregorian-result").innerHTML = `Invalid Day (Month ${month} only has ${maxDays} days in AH ${year})`;
        if (document.getElementById("gregorian-source")) {
            document.getElementById("gregorian-source").innerHTML = "";
        }
        return;
    }

    const resultBox = document.getElementById("gregorian-result");
    const sourceBadge = document.getElementById("gregorian-source");

    resultBox.classList.add("loading-pulse");

    const result = await fetchHijriToGregorian(year, month, day);

    resultBox.classList.remove("loading-pulse");
    resultBox.innerHTML = `${result.day} ${result.month} ${result.year} CE`;

    if (sourceBadge) {
        sourceBadge.innerHTML = `Data Source: ${result.source}`;
    }
}
