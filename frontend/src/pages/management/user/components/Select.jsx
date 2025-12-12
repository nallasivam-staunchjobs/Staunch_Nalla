import { React, useState } from "react";

export function Select({ value, onValueChange, children }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (val) => {
        onValueChange(val);
        setOpen(false);
    };

    return (
        <div className="relative w-full">
            {React.Children.map(children, (child) => {
                if (child.type === SelectTrigger) {
                    return React.cloneElement(child, {
                        onClick: () => setOpen(!open),
                        value,
                    });
                }
                if (child.type === SelectContent) {
                    return React.cloneElement(child, {
                        show: open,
                        onSelect: handleSelect,
                    });
                }
                return child;
            })}
        </div>
    );
}

export function SelectTrigger({ onClick, children }) {
    return (
        <div
            onClick={onClick}
            className="border border-gray-300 rounded px-3 py-2 cursor-pointer bg-white w-full"
        >
            {children}
        </div>
    );
}

export function SelectValue({ value, placeholder }) {
    return <span>{value || placeholder}</span>;
}

export function SelectContent({ show, onSelect, children }) {
    return show ? (
        <ul className="absolute z-10 mt-1 bg-white border border-gray-300 w-full rounded shadow-md">
            {React.Children.map(children, (child) =>
                React.cloneElement(child, { onSelect })
            )}
        </ul>
    ) : null;
}

export function SelectItem({ value, children, onSelect }) {
    return (
        <li
            className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
            onClick={(e) => {
                e.stopPropagation();
                onSelect(value);
            }}
        >
            {children}
        </li>
    );
}
