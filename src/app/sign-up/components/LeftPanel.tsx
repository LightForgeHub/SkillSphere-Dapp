const LeftPanel = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[51%] items-center justify-center p-8">
      <div
        className="w-[744px]  relative  rounded-3xl p-12"
        style={{
          boxShadow: "inset 0px 0px 40px 20px rgba(100, 59, 132, 0.5)",
          background:
            " linear-gradient(180deg, #674284 0%, #603186 12.68%, #311745 47.53%, #09020F 67.16%)",
        }}
      >
        <h1 className="text-white text-2xl font-bold mb-5">SkillSphere</h1>

        <div className="flex items-center justify-center mb-32">
          <div className="relative w-[508px] h-[508px]">
            <img src={"/sphere-glass.svg"} alt="glassImg" />
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0">
          <h2 className="text-white text-3xl font-bold text-center mb-3">
            Get Started with us
          </h2>
          <p className="text-white text-center mb-8 opacity-90">
            Complete these easy steps to register your account
          </p>

          <div className="space-y-3 w-[347px] mx-auto">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className="flex items-center  px-6 py-4 rounded-lg transition-all"
                style={{
                  backgroundColor:
                    num === 1 ? "#FFFFFF" : "rgba(255, 255, 255, 0.2)",
                  color: num === 1 ? "#000000" : "#FFFFFF",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4"
                  style={{
                    backgroundColor:
                      num === 1 ? "#000000" : "rgba(255, 255, 255, 0.3)",
                    color: num === 1 ? "#FFFFFF" : "#FFFFFF",
                  }}
                >
                  {num}
                </div>
                <span className="font-medium">Get Started with us</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
