import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Mailbox, MessageSquare } from "lucide-react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouse = useRef({ x: 250, y: 300 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Responsive resize
    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    // Mouse move
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // Particle system
    const colors = ["#2196f3", "#e040fb", "#ff9800", "#00e676", "#ff1744"];
    const particles = Array.from({ length: 18 }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      r: 28 + Math.random() * 10,
      color: colors[i % colors.length],
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      // Draw and update particles
      for (let p of particles) {
        // Liquid attraction to mouse
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          // Softly attract
          p.vx += dx * 0.0012;
          p.vy += dy * 0.0012;
        }
        // Friction
        p.vx *= 0.98;
        p.vy *= 0.98;
        // Move
        p.x += p.vx;
        p.y += p.vy;
        // Bounce off walls
        if (p.x < p.r) { p.x = p.r; p.vx *= -0.7; }
        if (p.x > width - p.r) { p.x = width - p.r; p.vx *= -0.7; }
        if (p.y < p.r) { p.y = p.r; p.vy *= -0.7; }
        if (p.y > height - p.r) { p.y = height - p.r; p.vy *= -0.7; }
      }
      // Draw liquid blobs
      for (let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + "cc"; // semi-transparent
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="relative flex flex-col justify-center items-center p-6 sm:p-12 overflow-hidden">
        {/* Liquid Canvas Background */}
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "auto", width: "100%", height: "100%" }} />
        <div className="w-full max-w-md space-y-8" style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
              transition-colors"
              >
                <Mailbox className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />
    </div>
  );
};
export default LoginPage;
