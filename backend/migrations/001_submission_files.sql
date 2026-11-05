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
        CONSTRAINT UQ_SubmissionFiles_SubmissionID_FileURL
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
