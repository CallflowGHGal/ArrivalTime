(function () {

    var CACHE_KEY = 'ArrivalTime-processIds-cache-v1';

    // ----- קריאת CACHE של רשימת ה-ProcessId מה-localStorage -----
    function loadCacheProcessIds() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return null;
            return arr;
        } catch (e) {
            console.log("CJS: error reading processIds cache", e);
            return null;
        }
    }

    // ----- כתיבת CACHE -----
    function saveCacheProcessIds(processIds) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(processIds || []));
        } catch (e) {
            console.log("CJS: error writing processIds cache", e);
        }
    }

    // ----- השוואת מערכים -----
    function arraysEqual(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // ----- 1. שליפת כל ה-processId מה-CaseList -----
    function getProcessIds() {
        try {
            var $jq = window.jQuery || window.$;
            if (!$jq) {
                console.log("CJS: jQuery not found");
                return [];
            }

            var $spans = $jq('#ctl00_cphMain_CaseList_pnlList')
                .find('span.caseListPropertyWrapper[data-id]');

            console.log("found spans (CJS):", $spans.length);

            var ids = $spans.map(function () {
                return $jq(this).attr('data-id');
            }).get();

            // הסרה של כפולים + מיון
            var unique = [];
            var seen = {};
            for (var i = 0; i < ids.length; i++) {
                var id = String(ids[i]).trim();
                if (id && !seen[id]) {
                    seen[id] = true;
                    unique.push(id);
                }
            }

            unique.sort(function (a, b) {
                var na = parseInt(a, 10);
                var nb = parseInt(b, 10);
                if (isNaN(na) || isNaN(nb)) {
                    return a.localeCompare(b);
                }
                return na - nb;
            });

            return unique;

        } catch (e) {
            console.log("CJS error in getProcessIds:", e);
            return [];
        }
    }

    // ----- 2. בניית URL ל-API (GetProcessArrivalTimes) -----
    function buildArrivalTimeUrl(processIds) {
        // בסיס ה-URL של ה-API שלך (כמו בסוואגר)
        var baseUrl = "https://localhost:44344/api/extensions/ArrivalTime/GetProcessArrivalTimes";

        var query = processIds.map(function (id) {
            return "processesId=" + encodeURIComponent(id);
        }).join("&");

        return baseUrl + "?" + query;
    }

    // ----- 3. קריאה ל-API (רק כדי לעדכן PCP ב-DB) -----
    function callArrivalTimeApi(processIds) {
        var $jq = window.jQuery || window.$;
        if (!$jq) {
            console.log("CJS: jQuery not found (in callArrivalTimeApi)");
            return;
        }

        if (!processIds || !processIds.length) {
            console.log("CJS: no process IDs to send to API");
            return;
        }

        var url = buildArrivalTimeUrl(processIds);
        console.log("CJS calling ArrivalTime API:", url);

        $jq.ajax({
            url: url,
            type: "GET",
            success: function (data) {
                console.log("ArrivalTime API success. Rows returned:", (data && data.length) || 0);
                // לא חייבים לעשות כלום עם data – ה-SP כבר עדכן את ה-PCP ב-DB
                // כשתרענן את רשימת הפניות, המסך ימשוך את ה-PCP לבד.
            },
            error: function (xhr, status, error) {
                console.log("ArrivalTime API error:", status, error);
            }
        });
    }

    // ----- 4. לוגיקה מרכזית: מה עושים כשמתעדכן ה-CaseList -----
    function onCaseListUpdated() {
        var ids = getProcessIds();
        if (!ids.length) {
            console.log("CJS: no cases found on caseListUpdated");
            return;
        }

        console.log("CJS process list:", ids.join(','));

        /*var cachedIds = loadCacheProcessIds();
        if (cachedIds && arraysEqual(ids, cachedIds)) {
            console.log("CJS: process list unchanged, skipping API call");
            return;
        }*/

        // רשימת התורים השתנתה → לקרוא ל-API ולעדכן CACHE
        console.log("CJS: process list changed, calling API");
        //saveCacheProcessIds(ids);
        callArrivalTimeApi(ids);
    }

    // ----- 5. חיבור לאירועים -----
    var $jq = window.jQuery || window.$;
    if ($jq) {
        $jq(document).on('caseListUpdated', function () {
            onCaseListUpdated();
        });

        $jq(function () {
            onCaseListUpdated();
        });
    } else {
        console.log("CJS: jQuery not found at script load");
    }


console.log("AFTER 3")
})();
