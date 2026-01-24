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
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-5 lg:gap-8 items-center">
            
            <div className="flex justify-center lg:justify-start">
              <Image
                src="/space-man.png"
                width={500}
                height={500}
                alt="Astronaut"
                className="w-full max-w-[400px] sm:max-w-[450px] lg:max-w-[500px] h-auto object-contain rounded-4xl"
                priority
              />
            </div>

           
            <div className="text-center lg:text-left">
              <p className="text-sm sm:text-base text-gray-400 mb-4 font-work">
                Ready To Tokenize Your Time Or Book The Best?
              </p>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-work font-bold leading-tight mb-8">
                Join As Expert/Seeker
                <br />
                Today
              </h2>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center sm:items-stretch">
                <button className="px-10 py-4 bg-white text-black font-bold rounded-4xl  md:rounded-l-4xl hover:bg-gray-300 transition-colors w-full  sm:w-auto text-lg cursor-pointer">
                  Join As Expert
                </button>
                <button className="px-10 py-4 font-bold bg-[#8B5CF6] rounded-4xl  md:rounded-l-3xl rounded-r-4xl hover:bg-[#7C3AED] transition-colors w-full sm:w-auto text-lg cursor-pointer mt-4 sm:mt-0 sm:-ml-8 z-10">
                  Join As Seeker
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
