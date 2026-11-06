USE ELearningDB;
GO

SELECT
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    fk.name AS ForeignKeyName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable
FROM sys.foreign_keys fk
ORDER BY TableName, ForeignKeyName;
GO


USE ELearningDB;
GO

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @AdminID INT;
    DECLARE @InstructorID INT;
    DECLARE @StudentID INT;
    DECLARE @CategoryID INT;
    DECLARE @CourseID INT;
    DECLARE @LessonID INT;
    DECLARE @AssignmentID INT;
    DECLARE @QuizID INT;
    DECLARE @QuestionID INT;

    -- 1. Users
    IF NOT EXISTS (
        SELECT 1 FROM Users
        WHERE Email = 'admin.test@elearning.local'
    )
    INSERT INTO Users
        (FirstName, LastName, Email, PasswordHash, Role)
    VALUES
        ('Test', 'Admin', 'admin.test@elearning.local',
         'TEST_ONLY_NOT_A_REAL_HASH', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM Users
        WHERE Email = 'instructor.test@elearning.local'
    )
    INSERT INTO Users
        (FirstName, LastName, Email, PasswordHash, Role)
    VALUES
        ('Test', 'Instructor', 'instructor.test@elearning.local',
         'TEST_ONLY_NOT_A_REAL_HASH', 'Instructor');

    IF NOT EXISTS (
        SELECT 1 FROM Users
        WHERE Email = 'student.test@elearning.local'
    )
    INSERT INTO Users
        (FirstName, LastName, Email, PasswordHash, Role)
    VALUES
        ('Test', 'Student', 'student.test@elearning.local',
         'TEST_ONLY_NOT_A_REAL_HASH', 'Student');

    SELECT @AdminID = UserID FROM Users
    WHERE Email = 'admin.test@elearning.local';

    SELECT @InstructorID = UserID FROM Users
    WHERE Email = 'instructor.test@elearning.local';

    SELECT @StudentID = UserID FROM Users
    WHERE Email = 'student.test@elearning.local';

    -- 2. Category
    IF NOT EXISTS (
        SELECT 1 FROM Categories
        WHERE Name = 'Programim'
    )
    INSERT INTO Categories (Name, Description)
    VALUES ('Programim', 'Kurse per programim');

    SELECT @CategoryID = CategoryID
    FROM Categories
    WHERE Name = 'Programim';

    -- 3. Course
    IF NOT EXISTS (
        SELECT 1 FROM Courses
        WHERE Title = 'Hyrje ne Programim'
          AND InstructorID = @InstructorID
    )
    INSERT INTO Courses
        (InstructorID, CategoryID, Title, Description, Status)
    VALUES
        (@InstructorID, @CategoryID,
         'Hyrje ne Programim',
         'Kurs testues per platformen e mesimit online',
         'Active');

    SELECT @CourseID = CourseID
    FROM Courses
    WHERE Title = 'Hyrje ne Programim'
      AND InstructorID = @InstructorID;

    -- 4. Enrollment
    IF NOT EXISTS (
        SELECT 1 FROM Enrollments
        WHERE StudentID = @StudentID
          AND CourseID = @CourseID
    )
    INSERT INTO Enrollments (CourseID, StudentID)
    VALUES (@CourseID, @StudentID);

    -- 5. Lesson
    IF NOT EXISTS (
        SELECT 1 FROM Lessons
        WHERE CourseID = @CourseID
          AND OrderNumber = 1
    )
    INSERT INTO Lessons
        (CourseID, Title, Description, OrderNumber)
    VALUES
        (@CourseID, 'Hyrje ne HTML',
         'Mesimi i pare testues', 1);

    SELECT @LessonID = LessonID
    FROM Lessons
    WHERE CourseID = @CourseID
      AND OrderNumber = 1;

    -- 6. Material
    IF NOT EXISTS (
        SELECT 1 FROM Materials
        WHERE LessonID = @LessonID
          AND Title = 'Materiali HTML'
    )
    INSERT INTO Materials
        (LessonID, Title, FileURL, MaterialType)
    VALUES
        (@LessonID, 'Materiali HTML',
         '/uploads/html-guide.pdf', 'PDF');

    -- 7. Assignment
    IF NOT EXISTS (
        SELECT 1 FROM Assignments
        WHERE CourseID = @CourseID
          AND Title = 'Detyra e pare'
    )
    INSERT INTO Assignments
        (CourseID, LessonID, Title, Description, MaxPoints)
    VALUES
        (@CourseID, @LessonID, 'Detyra e pare',
         'Detyre testuese', 100);

    SELECT @AssignmentID = AssignmentID
    FROM Assignments
    WHERE CourseID = @CourseID
      AND Title = 'Detyra e pare';

    -- 8. Submission
    IF NOT EXISTS (
        SELECT 1 FROM Submissions
        WHERE AssignmentID = @AssignmentID
          AND StudentID = @StudentID
    )
    INSERT INTO Submissions
        (AssignmentID, StudentID, FileURL, Grade, Feedback)
    VALUES
        (@AssignmentID, @StudentID,
         '/uploads/submission-test.pdf', 90,
         'Dorezim testues');

    -- 9. Quiz
    IF NOT EXISTS (
        SELECT 1 FROM Quizzes
        WHERE CourseID = @CourseID
          AND Title = 'Kuizi i pare'
    )
    INSERT INTO Quizzes
        (CourseID, LessonID, Title, Description)
    VALUES
        (@CourseID, @LessonID, 'Kuizi i pare',
         'Kuiz testues');

    SELECT @QuizID = QuizID
    FROM Quizzes
    WHERE CourseID = @CourseID
      AND Title = 'Kuizi i pare';

    -- 10. Question
    IF NOT EXISTS (
        SELECT 1 FROM Questions
        WHERE QuizID = @QuizID
          AND QuestionText = 'Cfare eshte HTML?'
    )
    INSERT INTO Questions (QuizID, QuestionText, Points)
    VALUES (@QuizID, 'Cfare eshte HTML?', 5);

    SELECT @QuestionID = QuestionID
    FROM Questions
    WHERE QuizID = @QuizID
      AND QuestionText = 'Cfare eshte HTML?';

    -- 11. Question options
    IF NOT EXISTS (
        SELECT 1 FROM QuestionOptions
        WHERE QuestionID = @QuestionID
          AND OptionText = 'Gjuhe per strukturimin e faqeve web'
    )
    INSERT INTO QuestionOptions
        (QuestionID, OptionText, IsCorrect)
    VALUES
        (@QuestionID, 'Gjuhe per strukturimin e faqeve web', 1);

    IF NOT EXISTS (
        SELECT 1 FROM QuestionOptions
        WHERE QuestionID = @QuestionID
          AND OptionText = 'Sistem operativ'
    )
    INSERT INTO QuestionOptions
        (QuestionID, OptionText, IsCorrect)
    VALUES
        (@QuestionID, 'Sistem operativ', 0);

    -- 12. Quiz attempt
    IF NOT EXISTS (
        SELECT 1 FROM QuizAttempts
        WHERE QuizID = @QuizID
          AND StudentID = @StudentID
    )
    INSERT INTO QuizAttempts
        (QuizID, StudentID, Score, CompletedAt)
    VALUES
        (@QuizID, @StudentID, 5, SYSDATETIME());

    -- 13. Progress
    IF NOT EXISTS (
        SELECT 1 FROM Progress
        WHERE StudentID = @StudentID
          AND CourseID = @CourseID
          AND LessonID = @LessonID
    )
    INSERT INTO Progress
        (StudentID, CourseID, LessonID, Completed, CompletedAt)
    VALUES
        (@StudentID, @CourseID, @LessonID, 1, SYSDATETIME());

    COMMIT TRANSACTION;
    PRINT 'Te dhenat testuese u ruajten me sukses.';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO



