import React from "react";
import type { IModule } from "@dmwork/base/src/Service/Module";
import { WKApp } from "@dmwork/base";
import SummaryListPage from "./pages/SummaryListPage";
import SummaryCreatePage from "./pages/SummaryCreatePage";
import SummaryDetailPage from "./pages/SummaryDetailPage";
import SummaryConfirmPage from "./pages/SummaryConfirmPage";
import ScheduleListPage from "./pages/ScheduleListPage";
import { getChatCandidates } from "./api/summaryApi";
import "./index.css";

let _spaceChangedHandler: (() => void) | null = null;

export class SummaryModule implements IModule {
    id(): string {
        return "SummaryModule";
    }

    init(): void {
        WKApp.openSummaryDetail = (taskId: number) => {
            WKApp.switchToMenuById?.("summary");
            WKApp.routeLeft.popToRoot();
            WKApp.routeRight.replaceToRoot(
                <SummaryDetailPage taskId={taskId} />
            );
        };

        WKApp.route.register("/summary", () => {
            return <SummaryListPage />;
        });

        WKApp.route.register("/summary/create", () => {
            return <SummaryCreatePage />;
        });

        WKApp.route.register("/summary/detail", (param: any) => {
            return <SummaryDetailPage taskId={param?.taskId} />;
        });

        WKApp.route.register("/summary/confirm", (param: any) => {
            return <SummaryConfirmPage taskId={param?.taskId} />;
        });

        WKApp.route.register("/summary/schedules", () => {
            return <ScheduleListPage />;
        });

        _spaceChangedHandler = () => {
            WKApp.mittBus.emit('summary-space-changed');
        };
        WKApp.mittBus.on('space-changed', _spaceChangedHandler);

        WKApp.searchChatCandidates = async (params) => {
            return getChatCandidates(params);
        };
    }
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (_spaceChangedHandler) {
            WKApp.mittBus.off('space-changed', _spaceChangedHandler);
            _spaceChangedHandler = null;
        }
    });
}
