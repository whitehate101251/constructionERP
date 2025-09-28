import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

export type TimeValue = { hours: number; minutes: number; period: "AM" | "PM" };

interface GoogleTimePickerProps {
  value: TimeValue;
  onChange: (val: TimeValue) => void;
  className?: string;
}

const GoogleTimePicker: React.FC<GoogleTimePickerProps> = ({ value, onChange, className }) => {
  const [clockMode, setClockMode] = useState<"hours" | "minutes">("hours");
  const clockRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clock calculations
  const clockRadius = 90;
  const centerX = 110;
  const centerY = 110;

  const getClockPosition = (val: number, isHour = true) => {
    const angle = isHour
      ? (((val === 12 ? 0 : val) * 30 - 90) * Math.PI) / 180
      : (((val * 6) - 90) * Math.PI) / 180;

    const x = centerX + clockRadius * Math.cos(angle);
    const y = centerY + clockRadius * Math.sin(angle);
    return { x, y };
  };

  const getValueFromPosition = (clientX: number, clientY: number) => {
    if (!clockRef.current) return null;

    const rect = clockRef.current.getBoundingClientRect();
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    if (clockMode === "hours") {
      const hour = Math.round(angle / 30);
      return hour === 0 ? 12 : hour;
    } else {
      const minute = Math.round(angle / 6);
      return minute === 60 ? 0 : minute;
    }
  };

  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const v = getValueFromPosition(e.clientX, e.clientY);
    if (v !== null) {
      if (clockMode === "hours") {
        onChange({ ...value, hours: v });
      } else {
        onChange({ ...value, minutes: v });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    handleClockClick(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const v = getValueFromPosition(e.clientX, e.clientY);
      if (v !== null) {
        if (clockMode === "hours") {
          onChange({ ...value, hours: v });
        } else {
          onChange({ ...value, minutes: v });
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const selectedPos = getClockPosition(
    clockMode === "hours" ? value.hours : value.minutes,
    clockMode === "hours"
  );

  const numbers = clockMode === "hours"
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className={className}>
      <div className="p-2 pb-1">
        <div className="flex items-center gap-3 mb-4 justify-center">
          <Clock size={18} className="text-gray-600" />
          <span className="text-sm font-normal text-gray-900">Select time</span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center">
            <button
              onClick={() => setClockMode("hours")}
              className={`px-3 py-2 text-3xl font-normal transition-all duration-150 ${
                clockMode === "hours"
                  ? "bg-blue-100 text-blue-600 rounded-lg"
                  : "text-gray-900 hover:bg-gray-100 rounded-lg"
              }`}
            >
              {value.hours.toString().padStart(2, "0")}
            </button>
            <span className="text-3xl font-normal text-gray-900 mx-2">:</span>
            <button
              onClick={() => setClockMode("minutes")}
              className={`px-3 py-2 text-3xl font-normal transition-all duration-150 ${
                clockMode === "minutes"
                  ? "bg-blue-100 text-blue-600 rounded-lg"
                  : "text-gray-900 hover:bg-gray-100 rounded-lg"
              }`}
            >
              {value.minutes.toString().padStart(2, "0")}
            </button>
          </div>
          <div className="flex flex-col ml-3">
            <button
              onClick={() => onChange({ ...value, period: "AM" })}
              className={`px-3 py-1 text-xs font-medium transition-all duration-150 ${
                value.period === "AM"
                  ? "bg-blue-600 text-white rounded"
                  : "text-gray-600 hover:bg-gray-100 rounded"
              }`}
            >
              AM
            </button>
            <button
              onClick={() => onChange({ ...value, period: "PM" })}
              className={`px-3 py-1 text-xs font-medium mt-1 transition-all duration-150 ${
                value.period === "PM"
                  ? "bg-blue-600 text-white rounded"
                  : "text-gray-600 hover:bg-gray-100 rounded"
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      <div className="px-2 pb-2">
        <div className="relative w-56 h-56 mx-auto">
          <svg
            ref={clockRef}
            className="w-full h-full cursor-pointer"
            onMouseDown={handleMouseDown}
          >
            <circle cx={centerX} cy={centerY} r={clockRadius} fill="#f8f9fa" stroke="none" />
            {numbers.map((num) => {
              const pos = getClockPosition(num, clockMode === "hours");
              const isSelected = clockMode === "hours"
                ? num === value.hours
                : num === Math.floor(value.minutes / 5) * 5;
              return (
                <g key={num}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={18}
                    fill={isSelected ? "#1976d2" : "transparent"}
                    className="transition-all duration-150"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-base font-normal transition-colors duration-150 ${
                      isSelected ? "fill-white" : "fill-gray-800"
                    }`}
                  >
                    {clockMode === "minutes" ? String(num).padStart(2, "0") : num}
                  </text>
                </g>
              );
            })}
            <circle cx={centerX} cy={centerY} r={3} fill="#1976d2" />
            <line
              x1={centerX}
              y1={centerY}
              x2={selectedPos.x}
              y2={selectedPos.y}
              stroke="#1976d2"
              strokeWidth={2}
              className="transition-all duration-150"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GoogleTimePicker;
