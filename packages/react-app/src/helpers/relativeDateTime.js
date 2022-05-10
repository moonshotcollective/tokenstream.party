import ago from "s-ago";
import { parseISO } from "date-fns";

export default function relativeDateTime(aDateString) {
    return ago(parseISO(aDateString));
}