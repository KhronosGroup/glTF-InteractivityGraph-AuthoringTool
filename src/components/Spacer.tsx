export const Spacer = (props: {width: number, height: number}) => {
    const spacerStyle = {
        width: props.width || 0,
        height: props.height || 0,
        display: "inline-block"
    };

    return <div style={spacerStyle}/>;
};
