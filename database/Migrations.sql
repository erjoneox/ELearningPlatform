-- Run once against the application database before using timed quizzes
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH(N'dbo.Quizzes', N'DurationMinutes') IS NULL
  BEGIN
    EXEC(N'ALTER TABLE dbo.Quizzes ADD DurationMinutes INT NULL;');
  END;

  IF OBJECT_ID(N'dbo.CK_Quizzes_DurationMinutes', N'C') IS NULL
  BEGIN
    EXEC(N'
      ALTER TABLE dbo.Quizzes
      ADD CONSTRAINT CK_Quizzes_DurationMinutes
      CHECK (
        DurationMinutes IS NULL
        OR DurationMinutes IN (5, 10, 15, 20)
      );
    ');
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  THROW;
END CATCH;


-- Run once against the application database before using scheduled quizzes
BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH(N'dbo.Quizzes', N'ScheduledStartAt') IS NULL
  BEGIN
    EXEC(N'ALTER TABLE dbo.Quizzes ADD ScheduledStartAt DATETIME2(7) NULL;');
  END;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  THROW;
END CATCH;

-- Run once against the application database to create SubmissionFiles and migrate existing submission files
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.SubmissionFiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubmissionFiles (
        SubmissionFileID INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_SubmissionFiles PRIMARY KEY,
        SubmissionID INT NOT NULL,
        FileURL NVARCHAR(500) NOT NULL,
        CreatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_SubmissionFiles_CreatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT FK_SubmissionFiles_Submissions
            FOREIGN KEY (SubmissionID) REFERENCES dbo.Submissions(SubmissionID),
        CONSTRAINT UQ_SubmissionFiles_Submission_File
            UNIQUE (SubmissionID, FileURL)
    );
END;

INSERT INTO dbo.SubmissionFiles (SubmissionID, FileURL)
SELECT s.SubmissionID, s.FileURL
FROM dbo.Submissions AS s
WHERE s.FileURL IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.SubmissionFiles AS sf
      WHERE sf.SubmissionID = s.SubmissionID
        AND sf.FileURL = s.FileURL
  );

COMMIT TRANSACTION;

-- Run once against the application database before creating or scoring quizzes

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @QuestionsPointsDefault SYSNAME;
    DECLARE @SQL NVARCHAR(MAX);

    -- Find the existing default constraint for Questions.Points
    SELECT @QuestionsPointsDefault = dc.name
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS col
        ON col.object_id = dc.parent_object_id
       AND col.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Questions')
      AND col.name = N'Points';

    -- Drop the existing default constraint if one exists
    IF @QuestionsPointsDefault IS NOT NULL
    BEGIN
        SET @SQL =
            N'ALTER TABLE dbo.Questions DROP CONSTRAINT '
            + QUOTENAME(@QuestionsPointsDefault) + N';';

        EXEC sp_executesql @SQL;
    END;

    -- Drop the existing CHECK constraint if it exists
    IF OBJECT_ID(N'dbo.CK_Questions_Points', N'C') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.Questions
        DROP CONSTRAINT CK_Questions_Points;
    END;

    -- Change Points to DECIMAL(9,4)
    ALTER TABLE dbo.Questions
    ALTER COLUMN Points DECIMAL(9,4) NOT NULL;

    -- Set the default value for Points
    ALTER TABLE dbo.Questions
    ADD CONSTRAINT DF_Questions_Points
        DEFAULT (1) FOR Points;

    -- Ensure that question points are greater than zero
    ALTER TABLE dbo.Questions
    ADD CONSTRAINT CK_Questions_Points
        CHECK (Points > 0);

    -- Drop the existing score CHECK constraint if it exists
    IF OBJECT_ID(N'dbo.CK_QuizAttempts_Score', N'C') IS NOT NULL
    BEGIN
        ALTER TABLE dbo.QuizAttempts
        DROP CONSTRAINT CK_QuizAttempts_Score;
    END;

    -- Allow Score to be NULL until the quiz attempt is scored
    ALTER TABLE dbo.QuizAttempts
    ALTER COLUMN Score DECIMAL(9,4) NULL;

    -- Ensure that a score cannot be negative
    ALTER TABLE dbo.QuizAttempts
    ADD CONSTRAINT CK_QuizAttempts_Score
        CHECK (Score IS NULL OR Score >= 0);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;