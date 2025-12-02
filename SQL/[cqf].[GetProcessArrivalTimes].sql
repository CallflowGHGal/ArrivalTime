USE [QFlow63sp1TEST]
GO

/****** Object:  StoredProcedure [cqf].[GetProcessArrivalTimes]    Script Date: 02-Dec-25 9:42:46 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [cqf].[GetProcessArrivalTimes]
(
    @ProcessIdList NVARCHAR(MAX) = NULL   -- למשל: '28,40'
)
AS
BEGIN
    SET NOCOUNT ON;

    -----------------------------------------------------------------
    -- 0. אם לא הגיעו IDs – להחזיר סט ריק
    -----------------------------------------------------------------
    IF @ProcessIdList IS NULL OR LTRIM(RTRIM(@ProcessIdList)) = ''
    BEGIN
        SELECT CAST(NULL AS INT) AS ProcessId,
               CAST(NULL AS CHAR(5)) AS ArrivalTime
        WHERE 1 = 0;
        RETURN;
    END;

    -----------------------------------------------------------------
    -- 1. רשימת ה-ProcessId בטבלה זמנית
    -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#ProcessList') IS NOT NULL
        DROP TABLE #ProcessList;

    CREATE TABLE #ProcessList
    (
        ProcessId INT PRIMARY KEY
    );

    INSERT INTO #ProcessList (ProcessId)
    SELECT DISTINCT TRY_CAST(LTRIM(RTRIM(value)) AS INT)
    FROM STRING_SPLIT(@ProcessIdList, ',')
    WHERE TRY_CAST(LTRIM(RTRIM(value)) AS INT) IS NOT NULL;

    -----------------------------------------------------------------
    -- 2. חישוב שעת ההגעה מתוך qf.Step (Action = 8)
    -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Arrival') IS NOT NULL
        DROP TABLE #Arrival;

    CREATE TABLE #Arrival
    (
        ProcessId        INT       PRIMARY KEY,
        ArrivalDateTime  DATETIME  NULL,
        ArrivalTimeHHMM  CHAR(5)   NULL
    );

    INSERT INTO #Arrival (ProcessId, ArrivalDateTime, ArrivalTimeHHMM)
    SELECT
        p.ProcessId,
        MIN(s.StartDate) AS ArrivalDateTime,
        CONVERT(CHAR(5), MIN(s.StartDate), 108) AS ArrivalTimeHHMM  -- HH:MM
    FROM #ProcessList AS p
    INNER JOIN qf.[Step] AS s
        ON s.ProcessId = p.ProcessId
       AND s.Action IN (0, 8)          -- הגעה לתור
    GROUP BY p.ProcessId;

    -----------------------------------------------------------------
    -- 3. עדכון / יצירת Process Custom Property "ArrivalTime"
    -----------------------------------------------------------------
    DECLARE @ArrivalPropertyId INT;

    SELECT @ArrivalPropertyId = d.PropertyId
    FROM qf.ProcessCustomPropertyDictionary AS d
    WHERE d.PropertyKey = 'ArrivalTime';

    IF @ArrivalPropertyId IS NOT NULL
    BEGIN
        -- 3a. UPDATE לרשומות קיימות
        UPDATE pcp
        SET    pcp.Value = a.ArrivalTimeHHMM
        FROM qf.ProcessCustomProperty AS pcp
        INNER JOIN #Arrival AS a
            ON a.ProcessId = pcp.ProcessId
        WHERE pcp.PropertyId = @ArrivalPropertyId;

        -- 3b. INSERT לרשומות חסרות
        INSERT INTO qf.ProcessCustomProperty (ProcessId, PropertyId, Value)
        SELECT
            a.ProcessId,
            @ArrivalPropertyId,
            a.ArrivalTimeHHMM
        FROM #Arrival AS a
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM qf.ProcessCustomProperty AS pcp
            WHERE pcp.ProcessId = a.ProcessId
              AND pcp.PropertyId = @ArrivalPropertyId
        );
    END;

    -----------------------------------------------------------------
    -- 4. פלט סופי – ProcessId + שעת הגעה (HH:MM)
    -----------------------------------------------------------------
    SELECT
        p.ProcessId,
        CONVERT(CHAR(5), a.ArrivalDateTime, 108) AS ArrivalTime
    FROM #ProcessList AS p
    LEFT JOIN #Arrival AS a
        ON a.ProcessId = p.ProcessId
    ORDER BY p.ProcessId;
END;
GO

