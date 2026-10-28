import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/enrollments/my-courses")
      .then((response) => {
        console.log("My courses API response:", response.data);

        const data = response.data;

        const enrolledCourses = Array.isArray(data)
          ? data
          : (data.courses ?? data.enrollments ?? data.data ?? []);

        setCourses(Array.isArray(enrolledCourses) ? enrolledCourses : []);
      })
      .catch((err) => {
        console.error("My courses error:", err.response?.data || err);

        setError(
          err.response?.data?.message ||
            "Nuk u arrit të ngarkohen kurset e tua.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />

      <main className="container py-5">
        <h1 className="fw-bold mb-2">Kurset e mia</h1>

        <p className="text-secondary mb-4">
          Kurset në të cilat je regjistruar.
        </p>

        {loading && <p>Duke ngarkuar kurset...</p>}

        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <div className="alert alert-info">
            Ende nuk je regjistruar në ndonjë kurs.
            <div className="mt-2">
              <Link to="/courses">Eksploro kurset</Link>
            </div>
          </div>
        )}

        <div className="row g-4">
          {courses.map((course) => {
            const id = course.CourseID ?? course.courseId;

            return (
              <div className="col-md-6 col-lg-4" key={id}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-4">
                    <h5 className="fw-bold">{course.Title ?? course.title}</h5>

                    <p className="text-secondary">
                      {course.Description ?? course.description ?? ""}
                    </p>

                    <Link to={`/courses/${id}`} className="btn btn-primary">
                      Vazhdo mësimin
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

export default MyCourses;
