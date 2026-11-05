import React from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  FolderOpen,
  GraduationCap,
  Play,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-white text-dark font-sans">
      {/* 1. HERO SECTION */}
      <section
        className="py-5 bg-light position-relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #F8F9FE 0%, #FFFFFF 100%)",
        }}
      >
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold text-dark lh-sm mb-3">
                Empowering <span style={{ color: "#5640EE" }}>Education</span>{" "}
                through Collaboration
              </h1>
              <p className="text-secondary lead fs-6 mb-4 pe-lg-4">
                A learning platform where instructors organize course videos,
                materials, assignments, and quizzes, while students follow
                lessons and review their results.
              </p>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <Link
                  to="/courses"
                  className="btn text-white fw-semibold px-4 py-3 rounded-3 shadow-sm"
                  style={{ backgroundColor: "#5640EE" }}
                >
                  Start Learning Now
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("landing-features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="btn btn-light btn-hover-shadow fw-semibold px-4 py-3 rounded-3 border shadow-sm d-flex align-items-center gap-2"
                >
                  <Play size={16} fill="currentColor" aria-hidden="true" />{" "}
                  Watch Demo
                </button>
              </div>
            </div>

            <div className="col-lg-6">
              <img
                src="/landing-logo.png"
                alt="EduFlow learning platform"
                className="img-fluid rounded-3 w-100"
                style={{ maxHeight: "420px", objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section className="py-5 border-bottom border-top border-light">
        <div className="container">
          <div className="row text-center g-4">
            <div className="col-6 col-md-3">
              <h2 className="fw-bold fs-4 mb-1 text-dark">Courses</h2>
              <p className="text-secondary small fw-bold text-uppercase tracking-wider mb-0">
                Organized learning
              </p>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="fw-bold fs-4 mb-1 text-dark">Lessons</h2>
              <p className="text-secondary small fw-bold text-uppercase tracking-wider mb-0">
                Video and materials
              </p>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="fw-bold fs-4 mb-1 text-dark">Assignments</h2>
              <p className="text-secondary small fw-bold text-uppercase tracking-wider mb-0">
                Submission and feedback
              </p>
            </div>
            <div className="col-6 col-md-3">
              <h2 className="fw-bold fs-4 mb-1 text-dark">Quizzes</h2>
              <p className="text-secondary small fw-bold text-uppercase tracking-wider mb-0">
                Attempts and results
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="landing-features" className="py-5 my-4">
        <div className="container py-4">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <h2 className="fw-bold fs-2 text-dark mb-2">
              Features built for modern learning
            </h2>
            <p className="text-secondary small">
              Everything you need to create, deliver, and experience
              high-quality educational content in one place.
            </p>
          </div>

          <div className="row g-4">
            {/* Feature 1 */}
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-white border-0 shadow-sm h-100">
                <div
                  className="d-flex align-items-center justify-content-center mb-4"
                  style={{
                    color: "#5640EE",
                  }}
                >
                  <Play size={22} aria-hidden="true" />
                </div>
                <h5 className="fw-bold text-dark mb-2">
                  Interactive Video Lessons
                </h5>
                <p className="text-secondary small mb-0">
                  Add video links to lessons and let students track their
                  completion through the course.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-white border-0 shadow-sm h-100">
                <div
                  className="d-flex align-items-center justify-content-center mb-4"
                  style={{
                    color: "#D97706",
                  }}
                >
                  <FileCheck2 size={22} aria-hidden="true" />
                </div>
                <h5 className="fw-bold text-dark mb-2">Smart Assessments</h5>
                <p className="text-secondary small mb-0">
                  Create quizzes with answer validation, automatic scoring, and
                  stored student results.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="col-md-4">
              <div className="p-4 rounded-4 bg-white border-0 shadow-sm h-100">
                <div
                  className="d-flex align-items-center justify-content-center mb-4"
                  style={{
                    color: "#137333",
                  }}
                >
                  <FolderOpen size={22} aria-hidden="true" />
                </div>
                <h5 className="fw-bold text-dark mb-2">Resource Management</h5>
                <p className="text-secondary small mb-0">
                  Centralized library for all course materials. Students can
                  easily access PDFs, slide decks, and external resources
                  anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-5 text-white"
        style={{ backgroundColor: "#0F172A" }}
      >
        <div className="container py-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="d-flex flex-column gap-4">
                {/* Instructor */}
                <div className="d-flex gap-3 align-items-start">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      color: "#818CF8",
                    }}
                  >
                    <UsersRound size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h5 className="fw-bold text-white mb-1">For Instructors</h5>
                    <p className="text-light opacity-75 small mb-0">
                      Build courses with ease, manage student cohorts, and get
                      deep insights into learning outcomes with our advanced
                      analytics engine.
                    </p>
                  </div>
                </div>

                {/* Students */}
                <div className="d-flex gap-3 align-items-start">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      color: "#C084FC",
                    }}
                  >
                    <GraduationCap size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h5 className="fw-bold text-white mb-1">For Students</h5>
                    <p className="text-light opacity-75 small mb-0">
                      Engage with course material in a distraction-free
                      environment. Track your progress and participate in
                      collaborative learning sessions.
                    </p>
                  </div>
                </div>

                {/* Administrators */}
                <div className="d-flex gap-3 align-items-start">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      color: "#34D399",
                    }}
                  >
                    <ShieldCheck size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h5 className="fw-bold text-white mb-1">
                      For Administrators
                    </h5>
                    <p className="text-light opacity-75 small mb-0">
                      Maintain full control over user management, course
                      permissions, and platform-wide security from a centralized
                      admin hub.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="ps-lg-4">
                <h2 className="display-5 fw-bold text-white mb-3">
                  One platform,{" "}
                  <span style={{ color: "#818CF8" }}>
                    endless possibilities
                  </span>
                </h2>
                <p className="text-light opacity-75 mb-4">
                  Whether you are teaching a small cohort or managing a
                  university-wide roll-out, EduFlow scales with your needs.
                </p>
                <Link
                  to="/courses"
                  className="btn btn-light fw-bold px-4 py-3 rounded-3 text-dark shadow-sm"
                >
                  Explore Platform Solutions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-5 bg-white border-top">
        <div className="container py-4">
          <div className="row g-4 mb-5">
            {/* Logo & Description */}
            <div className="col-lg-4">
              <Link
                to="/"
                aria-label="EduFlow - Faqja kryesore"
                className="d-inline-flex align-items-center gap-2 mb-3 text-decoration-none"
              >
                <Link
                  to="/"
                  aria-label="EduFlow - Faqja kryesore"
                  className="d-inline-flex align-items-center"
                >
                  <img
                    src="/full-logo.png"
                    alt="EduFlow"
                    style={{
                      display: "block",
                      width: "96px",
                      height: "42px",
                      filter: `
        drop-shadow(1px 0px 0px #000000) 
        drop-shadow(-1px 0px 0px #000000) 
        drop-shadow(0px 1px 0px #000000) 
        drop-shadow(0px -1px 0px #000000)
        drop-shadow(1px 1px 0px #000000) 
        drop-shadow(-1px -1px 0px #000000)
        drop-shadow(1px -1px 0px #000000) 
        drop-shadow(-1px 1px 0px #000000)
      `,
                    }}
                  />
                </Link>
              </Link>
              <p className="text-secondary small mb-0 pe-lg-4">
                Making quality education accessible and interactive for
                everyone, everywhere.
              </p>
            </div>

            {/* Platform Links */}
            <div className="col-6 col-md-3 col-lg-2">
              <h6 className="fw-bold text-dark mb-3">Platform</h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li>
                  <Link
                    to="/courses"
                    className="text-secondary text-decoration-none"
                  >
                    Courses
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Live Sessions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Instructor Tools
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Enterprise
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="col-6 col-md-3 col-lg-2">
              <h6 className="fw-bold text-dark mb-3">Resources</h6>
              <ul className="list-unstyled d-flex flex-column gap-2 small">
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-secondary text-decoration-none">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect / Socials */}
            <div className="col-lg-4">
              <h6 className="fw-bold text-dark mb-3">Connect</h6>
              <div className="d-flex gap-2">
                <div className="d-flex gap-2">
                  {/* Gmail */}
                  <a
                    href="mailto:contact@edu-flow.com"
                    className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "38px", height: "38px" }}
                    title="Gmail"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/+04544444444"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "38px", height: "38px" }}
                    title="WhatsApp"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17.472 14.382C17.11 14.201 15.358 13.336 15.029 13.216C14.7 13.096 14.459 13.036 14.218 13.396C13.977 13.756 13.292 14.542 13.084 14.783C12.876 15.024 12.668 15.054 12.306 14.873C11.944 14.692 10.776 14.31 9.395 13.083C8.307 12.115 7.575 10.923 7.367 10.562C7.159 10.201 7.346 10.01 7.527 9.829C7.689 9.667 7.886 9.407 8.067 9.196C8.248 8.985 8.308 8.835 8.428 8.594C8.548 8.353 8.488 8.142 8.398 7.961C8.308 7.78 7.583 6.014 7.281 5.289C6.989 4.582 6.69 4.675 6.47 4.675C6.259 4.675 6.018 4.665 5.777 4.665C5.536 4.665 5.145 4.755 4.823 5.115C4.501 5.475 3.6 6.31 3.6 8.025C3.6 9.74 4.843 11.406 5.014 11.647C5.185 11.888 7.487 15.421 11.01 16.942C11.851 17.304 12.511 17.518 13.023 17.68C13.864 17.947 14.625 17.907 15.221 17.818C15.892 17.717 17.307 16.962 17.598 16.137C17.889 15.312 17.889 14.607 17.8 14.456C17.71 14.305 17.834 14.563 17.472 14.382ZM12.037 21.6C10.088 21.6 8.201 21.07 6.541 20.08L6.155 19.851L2.12 20.91L3.197 16.974L2.946 16.575C1.869 14.862 1.301 12.879 1.301 10.835C1.301 4.908 6.136 0.073 12.063 0.073C14.922 0.073 17.632 1.187 19.652 3.211C21.672 5.235 22.78 7.95 22.78 10.809C22.78 16.736 17.964 21.6 12.037 21.6Z"
                        fill="#25D366"
                      />
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "38px", height: "38px" }}
                    title="Facebook"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24V15.563H7.078V12.073H10.125V9.413C10.125 6.402 11.916 4.734 14.658 4.734C15.97 4.734 17.344 4.969 17.344 4.969V7.92H15.83C14.34 7.92 13.875 8.845 13.875 9.797V12.073H17.203L16.671 15.563H13.875V24C19.612 23.094 24 18.1 24 12.073Z"
                        fill="#1877F2"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-4 border-top text-secondary small fs-7">
            <span>© 2026 EDUFLOW ENTERPRISE. ALL RIGHTS RESERVED.</span>
            <div className="d-flex gap-3">
              <span>DESIGNED WITH PASSION</span>
              <span>V1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
