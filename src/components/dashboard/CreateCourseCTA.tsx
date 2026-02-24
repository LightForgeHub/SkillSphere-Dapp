"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export function CreateCourseCTA() {
  const router = useRouter();
  return (
    <div className="mt-12">
      <h3 
        className="mb-6 capitalize"
        style={{
          color: '#FCFCFC',
       
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '24px',
          letterSpacing: '0%',
        }}
      >
        Create A New Course
      </h3>
      
      <Card 
        className="border-white/5 py-12"
        style={{ backgroundColor: '#1A1520' }}
      >
        <CardContent className="flex flex-col items-center justify-center space-y-8 text-center">
          <p 
            style={{
              fontFamily: 'Work Sans',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '24px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#94a3b8'
            }}
          >
            Create a new course, publish for new learners, and earn an income.
          </p>

          
          <div 
            className="flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
            style={{
              backgroundColor: '#2D2E2D',
              width: '72px',
              height: '72px',
              borderRadius: '400px',
              gap: '10px',
              padding: '24px',
              opacity: 1
            }}
            onClick={() => router.push("/dashboard/courses/create")}
          >
            <Plus className="size-full text-white/70" />
          </div>

          
          <Button 
            variant="secondary" 
            size="lg"
            className="uppercase tracking-wider font-bold text-sm h-14 px-8 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white border-none"
            onClick={() => router.push("/dashboard/courses/create")}
          >
            <Plus className="mr-2 size-5" />
            Create New Course
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
