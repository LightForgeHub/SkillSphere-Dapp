import Image from "next/image";

export function CTASection() {
  return (
    <div className="relative w-full bg-[#0B0113] overflow-hidden">
      <div
        className="relative w-full"
        style={{
          backgroundColor: "#0B0113",
          backgroundImage: `
            linear-gradient(
              213.91deg,
              rgba(23, 22, 22, 0) 61.67%,
              rgba(44, 9, 74, 0.71) 116.1%
            ),
            linear-gradient(
              144.95deg,
              rgba(19, 19, 19, 0) 50.66%,
              rgba(142, 56, 217, 0.15) 84.18%
            )
          `,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
       
            <div className="flex justify-center lg:justify-start">
              <div className="relative p-1">
                <Image
                  src="/space-man.png"
                  width={500}
                  height={500}
                  alt="Astronaut"
                  className="w-full max-w-[350px] sm:max-w-[400px] lg:max-w-[450px] h-auto object-contain"
                  priority
                />
              </div>
            </div>

         
            <div className="text-center lg:text-left flex justify-center ">
              <div className="p-6 sm:p-8 lg:p-10">
                <p className="text-xs sm:text-sm text-gray-400 mb-3 font-work">
                  Ready To Tokenize Your Time Or Book The Best?
                </p>

                <h2 className="text-3xl sm:text-4xl lg:text-4xl font-work font-bold leading-tight mb-8 text-white">
                  Join As Expert/Seeker
                  <br />
                  Today
                </h2>

                <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4 md:gap-0   md:max-w-sm ">
                  <button className="px-8 py-4 bg-white text-black font-bold font-work rounded-3xl md:rounded-r-none hover:bg-gray-300 transition-colors w-full md:w-auto z-10 cursor-pointer">
                    Join As Expert
                  </button>

                  <button className="px-8 py-4 font-bold font-work bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-3xl md:rounded-l-3xl sm:-ml-4 transition-colors w-full md:w-auto z-20 shadow-lg cursor-pointer">
                    Join As Seeker
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
