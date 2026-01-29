import Image from "next/image";

export function HeroSection() {
    const experts = [
        {
            name: "Harper Hernandez",
            role: "Human Resource Consultant",
            avatar: "/harper.svg",
        },
        {
            name: "Jane Anderson",
            role: "Software Specialist",
            avatar: "/jane.svg",
        },
        {
            name: "John Thompson",
            role: "Software Specialist",
            avatar: "/john.svg",
        },
        {
            name: "Mia Robinson",
            role: "Software Specialist",
            avatar: "/mia.svg",
        }
    ];

    return (
        <div className="relative w-full min-h-screen bg-background overflow-hidden">
            {/* Background Container */}
            <div className="relative w-full min-h-screen"
                style={{
                    backgroundColor: "var(--background)",
                    backgroundImage: "var(--bg-full-pattern)",
                    backgroundSize: "cover, cover, cover",
                    backgroundPosition: "center, center, center",
                    backgroundRepeat: "no-repeat",
                }}>

                {/* Background Images */}
               {/* <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    <Image
                        src="/frame-92.svg"
                        width={1920}
                        height={820}
                        alt=""
                        className="absolute w-full h-auto max-h-[820px] opacity-70 object-cover"
                        priority
                    />

                    <Image
                        src="/ellipse-192.png"
                        width={1920}
                        height={20}
                        alt=""
                        className="absolute w-full h-auto max-h-[20px] opacity-70 object-cover"
                    />

                    <Image
                        src="/noise.png"
                        width={1920}
                        height={1080}
                        alt=""
                        className="absolute w-full h-full opacity-70 object-cover"
                    />

                    <Image
                        src="/ellipse-193.png"
                        width={1000}
                        height={820}
                        alt=""
                        className="absolute w-auto h-auto max-w-[1000px] max-h-[820px] bottom-0 right-0 opacity-60 sm:bottom-20 sm:right-16"
                    />
                </div>  */}

                {/* Main Content */}
                <div className="max-w-[1840px] mx-auto relative px-4 sm:px-6 lg:px-8 xl:px-16 sm:pt-12 lg:pt-16">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-1 min-h-[calc(100vh-200px)] lg:min-h-[calc(820px-200px)]">

                        {/* Left Content */}
                        <div className="order-2 lg:order-1 mt-8 lg:mt-0">
                            <div className="relative z-20">
                                <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-[56px] text-center sm:text-left font-work font-bold leading-tight mb-4 sm:mb-6">
                                    Tokenize Your Expertise.<br className="hidden sm:block" /> {" "}
                                    Access Knowledge<br className="hidden sm:block" />
                                    Instantly.
                                </h1>
                                <p className="text-gray-300 font-work font-normal mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg">
                                    SkillSphere connects professionals and learners for<br className="hidden sm:block" />
                                    short, trust-less consultations powered by Stellar.
                                </p>
                                <div className="flex justify-center">
                                    <Image
                                        src="/sphere-vector.png"
                                        width={550}
                                        height={550}
                                        alt="Atom Graphic"
                                        className="w-64 h-64 py-5 self-center flex sm:w-80 sm:h-80 sm:hidden md:w-96 md:h-96 lg:w-[500px] lg:h-[500px] object-contain"
                                        priority
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                                    <button className="px-6 py-3 border border-foreground font-bold rounded-lg hover:bg-purple-500/10 transition-colors w-full sm:w-auto sm:max-w-[177px]">
                                        Join as Expert
                                    </button>
                                    <button className="px-6 py-3 font-bold bg-[#613485] rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors w-full sm:w-auto sm:max-w-[177px]">
                                        Explore Experts
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6 sm:gap-8 lg:gap-10 z-0">
                                <div className="flex items-center gap-2 sm:gap-3 font-inter">
                                    <Image
                                        src="/users.svg"
                                        width={39}
                                        height={30}
                                        alt="Users"
                                        className="w-8 h-6 sm:w-[39px] sm:h-[30px]"
                                    />
                                    <div>
                                        <div className="text-lg sm:text-xl text-gray-400/80 font-bold">12k</div>
                                        <div className="text-xs text-gray-400/80">Members</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 font-inter">
                                    <Image
                                        src="/bookmark.svg"
                                        width={39}
                                        height={30}
                                        alt="Bookmark"
                                        className="w-8 h-6 sm:w-[39px] sm:h-[30px]"
                                    />
                                    <div>
                                        <div className="text-lg sm:text-xl font-bold">11k</div>
                                        <div className="text-xs text-gray-400">Courses</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <Image
                                        src="/coins.svg"
                                        width={39}
                                        height={30}
                                        alt="Coins"
                                        className="w-8 h-6 sm:w-[39px] sm:h-[30px]"
                                    />
                                    <div>
                                        <div className="text-lg sm:text-xl font-bold">5k+</div>
                                        <div className="text-xs text-gray-400">Weekly Transactions</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Content - Atom Graphic */}
                        <div className="order-1 lg:order-2 flex justify-center lg:justify-start z-20">
                            <Image
                                src="/sphere-vector.png"
                                width={550}
                                height={550}
                                alt="Atom Graphic"
                                className="w-64 h-64 sm:w-80 hidden sm:block sm:h-80 md:w-96 md:h-96 lg:w-[500px] lg:h-[500px] object-contain"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Experts Section */}
            <div className="max-w-[1440px] relative mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 py-8 sm:py-12 lg:py-20 -mt-4 sm:-mt-8 lg:mt-8 z-20">
                <div
                    className="
                    md:max-h-50
                     bg-linear-to-r from-[#3B2751]/10 to-[#614C7C]/10
                     backdrop-blur-sm
                     rounded-2xl
                     p-4 sm:p-6 lg:p-8
                     border border-[#9D9D9D2B]
                    "
                >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <Image
                            src="/chart.svg"
                            width={39}
                            height={30}
                            alt="Trending"
                            className="w-8 h-6 sm:w-[39px] sm:h-[30px]"
                        />
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Top Experts of this week</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {experts.map((expert, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl transition-all cursor-pointer hover:bg-white/5"
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center">
                                    <Image
                                        src={expert.avatar}
                                        alt={expert.name}
                                        width={56}
                                        height={56}
                                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-sm sm:text-base truncate">{expert.name}</div>
                                    <div className="text-xs sm:text-sm text-gray-400 truncate">{expert.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}