import { motion } from "motion/react";

import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { testimonialsData } from "@/data/testimonialsData";

const formattedTestimonials = testimonialsData.community.map((testimonial) => ({
  text: testimonial.quote,
  name: testimonial.name,
  role: testimonial.title,
  avatar: testimonial.avatar,
  avatarColor: testimonial.avatarColor,
}));

const columnizedTestimonials = [0, 1, 2].map((columnIndex) =>
  formattedTestimonials.filter((_, testimonialIndex) => testimonialIndex % 3 === columnIndex)
);

export default function Testimonials() {
  return (
    <section className="py-20 bg-background dark:bg-accent transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: "-50px" }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* <div className="inline-flex items-center gap-2 border border-primary/30 text-primary rounded-full px-4 py-1 text-sm font-medium mb-4">
            Testimonials
          </div> */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What our members say
          </h2>
          <p className="text-lg text-muted-foreground">
            Real stories from people building careers, shipping products, and creating impact
            through the Nairobi DevOps Community.
          </p>
        </motion.div>

        <div className="relative mt-14">
          <div className="flex justify-center gap-6 md:gap-8 lg:gap-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]">
            <TestimonialsColumn testimonials={columnizedTestimonials[0]} duration={16} />
            <TestimonialsColumn
              testimonials={columnizedTestimonials[1]}
              duration={20}
              className="hidden md:block"
            />
            <TestimonialsColumn
              testimonials={columnizedTestimonials[2]}
              duration={18}
              className="hidden lg:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
