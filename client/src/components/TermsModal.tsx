// Displays the terms dialog and reports the user's consent.
// Displays the terms dialog and reports the user's consent.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TermsModalProps {
  onAgree?: () => void;
  onClose: () => void;
  viewOnly?: boolean;
}

export default function TermsModal({ onAgree, onClose, viewOnly = false }: TermsModalProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 5px tolerance: scrollTop can be fractional on some screens/zoom levels
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
      setScrolledToEnd(true);
    }
  }, []);

  // Unlock immediately if the content is too short to scroll
  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock page scroll while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="terms-title" className="text-xl font-semibold text-gray-900">
          Terms of Service
        </h2>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="my-4 flex-1 space-y-3 overflow-y-auto pr-2 text-sm text-gray-700"
        >
          <p>
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ut minus iure hic, placeat incidunt quis quo. Fugiat earum repellendus molestias aliquid nostrum eaque corrupti? Ut hic excepturi autem qui eaque aspernatur assumenda odit mollitia aliquam omnis. Tempora velit eius dolorem voluptatum minus quidem at libero dolor quasi minima delectus laborum nobis, culpa ad obcaecati veniam incidunt praesentium vero veritatis eum enim suscipit sequi! Perspiciatis eos nesciunt aut accusantium ut eveniet quae delectus maxime hic exercitationem perferendis quidem aspernatur optio ab voluptate praesentium ratione soluta explicabo assumenda velit doloribus, molestias eius placeat? Perspiciatis maiores molestiae mollitia eius rem rerum nam hic!
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim necessitatibus architecto quo quae molestias earum voluptate, neque placeat eligendi ab cumque ipsa ex, corrupti sit autem repellendus eveniet consequatur deleniti qui. Voluptatum fugit culpa repudiandae maxime laudantium laborum suscipit aperiam? Eos, nihil tempora explicabo optio ducimus nesciunt sed odit ea ipsum provident illum, ipsam et, ex ipsa nulla? Enim pariatur asperiores autem laudantium corrupti? Vero, porro ea tempore voluptates omnis dolores deleniti tenetur! Minima eos quo nulla ipsam officia dolor, quia odio non nemo iusto aperiam error nostrum enim impedit aliquam, accusantium commodi sapiente, quas praesentium sint? Perferendis numquam voluptatem, exercitationem labore ex consequatur iure reiciendis nesciunt veritatis ut porro quia ea id rerum similique quidem, doloremque aliquid! Ab quidem obcaecati quas fuga. Perferendis dolores culpa molestias qui fugiat aut exercitationem ipsum ullam doloremque! Adipisci iusto, necessitatibus eveniet obcaecati, libero nobis, recusandae deleniti voluptate dicta explicabo nemo placeat blanditiis quisquam neque. Soluta repudiandae ducimus quo enim delectus quis quos fuga architecto dolore praesentium dolorum, veritatis nemo dolores, reprehenderit itaque. Laborum molestias, quo autem praesentium adipisci placeat voluptatem temporibus impedit nisi ipsam illum reprehenderit! Enim, deserunt quam. Voluptatem veritatis, dolorem laboriosam obcaecati laudantium rerum! Eius ad aperiam consequuntur cum aspernatur itaque?
            
          </p>
        </div>

        <div className="flex justify-end gap-2">
          {viewOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!scrolledToEnd}
                onClick={onAgree}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300"
              >
                {scrolledToEnd ? "I Agree" : "Scroll to the bottom to agree"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}