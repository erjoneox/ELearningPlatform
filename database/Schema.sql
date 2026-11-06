
CREATE DATABASE ELearningDB;
GO

USE ELearningDB;
GO


USE ELearningDB;
GO

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active'
);
GO

CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL
);
GO

CREATE TABLE Courses (
    CourseID INT IDENTITY(1,1) PRIMARY KEY,
    InstructorID INT NOT NULL,
    CategoryID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Thumbnail NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT FK_Courses_Users
        FOREIGN KEY (InstructorID)
        REFERENCES Users(UserID),

    CONSTRAINT FK_Courses_Categories
        FOREIGN KEY (CategoryID)
        REFERENCES Categories(CategoryID)
);
GO

CREATE TABLE Enrollments (
    EnrollmentID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    StudentID INT NOT NULL,
    EnrolledAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT FK_Enrollments_Courses
        FOREIGN KEY (CourseID)
        REFERENCES Courses(CourseID),

    CONSTRAINT FK_Enrollments_Users
        FOREIGN KEY (StudentID)
        REFERENCES Users(UserID),

    CONSTRAINT UQ_Enrollments_Student_Course
        UNIQUE (StudentID, CourseID)
);
GO

CREATE TABLE Lessons (
    LessonID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    VideoURL NVARCHAR(500) NULL,
    OrderNumber INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Lessons_Courses
        FOREIGN KEY (CourseID)
        REFERENCES Courses(CourseID),

    CONSTRAINT UQ_Lessons_Course_Order
        UNIQUE (CourseID, OrderNumber)
);
GO


CREATE TABLE Materials (
    MaterialID INT IDENTITY(1,1) PRIMARY KEY,
    LessonID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    FileURL NVARCHAR(500) NOT NULL,
    MaterialType NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Materials_Lessons
        FOREIGN KEY (LessonID)
        REFERENCES Lessons(LessonID)
);
GO

CREATE TABLE Assignments (
    AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    LessonID INT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    DueDate DATETIME2 NULL,
    MaxPoints INT NOT NULL DEFAULT 100,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Assignments_Courses
        FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),

    CONSTRAINT FK_Assignments_Lessons
        FOREIGN KEY (LessonID) REFERENCES Lessons(LessonID),

    CONSTRAINT CK_Assignments_MaxPoints
        CHECK (MaxPoints > 0)
);
GO

-- 8. Submissions
CREATE TABLE Submissions (
    SubmissionID INT IDENTITY(1,1) PRIMARY KEY,
    AssignmentID INT NOT NULL,
    StudentID INT NOT NULL,
    FileURL NVARCHAR(500) NULL,
    SubmittedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Grade DECIMAL(5,2) NULL,
    Feedback NVARCHAR(MAX) NULL,

    CONSTRAINT FK_Submissions_Assignments
        FOREIGN KEY (AssignmentID)
        REFERENCES Assignments(AssignmentID),

    CONSTRAINT FK_Submissions_Users
        FOREIGN KEY (StudentID) REFERENCES Users(UserID),

    CONSTRAINT UQ_Submissions_Student_Assignment
        UNIQUE (StudentID, AssignmentID),

    CONSTRAINT CK_Submissions_Grade
        CHECK (Grade IS NULL OR Grade >= 0)
);
GO

-- 9. Quizzes
CREATE TABLE Quizzes (
    QuizID INT IDENTITY(1,1) PRIMARY KEY,
    CourseID INT NOT NULL,
    LessonID INT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Quizzes_Courses
        FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),

    CONSTRAINT FK_Quizzes_Lessons
        FOREIGN KEY (LessonID) REFERENCES Lessons(LessonID)
);
GO

-- 10. Questions
CREATE TABLE Questions (
    QuestionID INT IDENTITY(1,1) PRIMARY KEY,
    QuizID INT NOT NULL,
    QuestionText NVARCHAR(MAX) NOT NULL,
    Points INT NOT NULL DEFAULT 1,

    CONSTRAINT FK_Questions_Quizzes
        FOREIGN KEY (QuizID) REFERENCES Quizzes(QuizID),

    CONSTRAINT CK_Questions_Points
        CHECK (Points > 0)
);
GO

-- 11. QuestionOptions
CREATE TABLE QuestionOptions (
    OptionID INT IDENTITY(1,1) PRIMARY KEY,
    QuestionID INT NOT NULL,
    OptionText NVARCHAR(1000) NOT NULL,
    IsCorrect BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_QuestionOptions_Questions
        FOREIGN KEY (QuestionID)
        REFERENCES Questions(QuestionID)
);
GO

-- 12. QuizAttempts
CREATE TABLE QuizAttempts (
    AttemptID INT IDENTITY(1,1) PRIMARY KEY,
    QuizID INT NOT NULL,
    StudentID INT NOT NULL,
    Score DECIMAL(6,2) NULL,
    StartedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CompletedAt DATETIME2 NULL,

    CONSTRAINT FK_QuizAttempts_Quizzes
        FOREIGN KEY (QuizID) REFERENCES Quizzes(QuizID),

    CONSTRAINT FK_QuizAttempts_Users
        FOREIGN KEY (StudentID) REFERENCES Users(UserID),

    CONSTRAINT CK_QuizAttempts_Score
        CHECK (Score IS NULL OR Score >= 0)
);
GO

-- 13. Progress
CREATE TABLE Progress (
    ProgressID INT IDENTITY(1,1) PRIMARY KEY,
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    LessonID INT NOT NULL,
    Completed BIT NOT NULL DEFAULT 0,
    CompletedAt DATETIME2 NULL,

    CONSTRAINT FK_Progress_Users
        FOREIGN KEY (StudentID) REFERENCES Users(UserID),

    CONSTRAINT FK_Progress_Courses
        FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),

    CONSTRAINT FK_Progress_Lessons
        FOREIGN KEY (LessonID) REFERENCES Lessons(LessonID),

    CONSTRAINT UQ_Progress_Student_Course_Lesson
        UNIQUE (StudentID, CourseID, LessonID)
);
GO

