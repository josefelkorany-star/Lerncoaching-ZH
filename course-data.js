// Freigegebener Kursplan. Standardtarife pro Doppellektion und Kind bleiben unverändert.
// Jahresansicht, Monatsbeiträge, nächster Kurstag und Kalenderexport nutzen diese Daten.
globalThis.LCCourseData = (() => {
  const data = {
  "defaultYear": 2027,
  "timezone": "Europe/Zurich",
  "startTime": "09:30",
  "endTime": "11:30",
  "location": "Dörflistrasse 67, 8050 Zürich",
  "standardRates": [
    40,
    35,
    30
  ],
  "dates": [
    "2026-05-02",
    "2026-05-09",
    "2026-05-16",
    "2026-05-30",
    "2026-06-06",
    "2026-06-13",
    "2026-06-20",
    "2026-06-27",
    "2026-07-04",
    "2026-08-22",
    "2026-08-29",
    "2026-09-05",
    "2026-09-12",
    "2026-09-19",
    "2026-09-26",
    "2026-10-17",
    "2026-10-24",
    "2026-10-31",
    "2026-11-07",
    "2026-11-14",
    "2026-11-21",
    "2026-11-28",
    "2026-12-05",
    "2026-12-12",
    "2027-01-09",
    "2027-01-16",
    "2027-01-23",
    "2027-01-30",
    "2027-02-06",
    "2027-02-27",
    "2027-03-06",
    "2027-03-13",
    "2027-03-20",
    "2027-04-03",
    "2027-04-10",
    "2027-04-17",
    "2027-05-08",
    "2027-05-22",
    "2027-05-29",
    "2027-06-05",
    "2027-06-12",
    "2027-06-19",
    "2027-06-26",
    "2027-07-03",
    "2027-07-10",
    "2027-08-21",
    "2027-08-28",
    "2027-09-04",
    "2027-09-11",
    "2027-09-18",
    "2027-09-25",
    "2027-10-02",
    "2027-10-23",
    "2027-10-30",
    "2027-11-06",
    "2027-11-13",
    "2027-11-20",
    "2027-11-27",
    "2027-12-04",
    "2027-12-11"
  ],
  "freeDates2027": [
    {
      "date": "2027-01-02",
      "reason": "Jahreswechsel / Berchtoldstag",
      "confirmedException": true
    },
    {
      "date": "2027-02-13",
      "reason": "Sportferien"
    },
    {
      "date": "2027-02-20",
      "reason": "Sportferien"
    },
    {
      "date": "2027-03-27",
      "reason": "Osterwochenende",
      "confirmedException": true
    },
    {
      "date": "2027-04-24",
      "reason": "Frühlingsferien"
    },
    {
      "date": "2027-05-01",
      "reason": "Frühlingsferien"
    },
    {
      "date": "2027-05-15",
      "reason": "Pfingstwochenende",
      "confirmedException": true
    },
    {
      "date": "2027-07-17",
      "reason": "Sommerferien"
    },
    {
      "date": "2027-07-24",
      "reason": "Sommerferien"
    },
    {
      "date": "2027-07-31",
      "reason": "Sommerferien"
    },
    {
      "date": "2027-08-07",
      "reason": "Sommerferien"
    },
    {
      "date": "2027-08-14",
      "reason": "Sommerferien"
    },
    {
      "date": "2027-10-09",
      "reason": "Herbstferien"
    },
    {
      "date": "2027-10-16",
      "reason": "Herbstferien"
    },
    {
      "date": "2027-12-18",
      "reason": "Weihnachtsferien"
    },
    {
      "date": "2027-12-25",
      "reason": "Weihnachtsferien"
    }
  ]
};
  function freeze(value) {
    Object.values(value).forEach(item => { if (item && typeof item === "object") freeze(item); });
    return Object.freeze(value);
  }
  return freeze(data);
})();
