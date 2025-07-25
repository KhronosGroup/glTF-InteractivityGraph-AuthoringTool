import React, {ReactNode} from "react";

interface RenderIfProps {
    shouldShow: boolean;
    children: ReactNode;
}

export const RenderIf: React.FC<RenderIfProps> = ({ shouldShow, children }) => {
    if (shouldShow) {
        return <>{children}</>;
    } else {
        return null;
    }
};
