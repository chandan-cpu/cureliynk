// src/components/HeroSection.jsx
import heroImage from "../../assets/hero-health.jpg";
import sideImage from "../../assets/images/side-image-hero.png";

export default function HeroSection() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden px-8 md:px-10 py-8 relative"
      style={{
        backgroundImage: `linear-gradient(90deg, #F3FAF3 0%, #F7FCF6 55%, #EAF5EA 100%), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative flex items-center justify-between gap-6 min-h-[220px]">
        {/* LEFT CONTENT */}
        <div className="max-w-[360px]">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Good Morning, User! 🌿
          </h1>

          <p className="text-gray-600 mt-4 text-base md:text-lg leading-7">
            Your health is our priority.
            <br />
            Let’s live a better and healthier life.
          </p>

          <button className="mt-6 bg-green-500 hover:bg-green-600 transition text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-sm">
            Book Appointment
          </button>
        </div>

        {/* RIGHT IMAGE */}
        <div className="flex-1 flex justify-end">
          <img
            src={sideImage}
            alt="Healthcare illustration"
            className="w-[320px] md:w-[520px] aspect-[16/9] object-contain"
          />
        </div>
      </div>
    </div>
  );
}