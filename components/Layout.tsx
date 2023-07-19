import { useCallback, useMemo, useState } from 'react';

import { css } from '@emotion/core';
import { useRouter } from 'next/router';

import themes, { ThemeProvider, breakpoints } from '@soomo/lib/styles/themes';
import { useCustomEventListener } from '@soomo/lib/hooks';

import TopBar from '../components/TopBar';
import TopPageInfo from '../components/TopPageInfo';
import BottomPageInfoAndLinks from '../components/BottomPageInfoAndLinks';

import type { FamilyId, Page, SQRResetResponse, SQRSaveResponse } from '../types';
import AriaLiveAnnouncer from '@soomo/lib/components/AriaLiveAnnouncer';
import PageElements from './PageElements';

interface Props {
	page: Page;
	backUrl?: string;
	nextUrl?: string;
}

const Layout: React.VFC<Props> = ({ page, backUrl, nextUrl }) => {
	const [isInstructorView, setInstructorView] = useState(false);
	const [answeredQuestionsMap, setAnsweredQuestionsMap] = useState<
		Record<FamilyId, SQRSaveResponse>
	>({});
	const router = useRouter();
	const numAttempted = Object.values(answeredQuestionsMap).filter(Boolean).length;
	const numCorrect = Object.values(answeredQuestionsMap).filter((res) => res.is_correct).length;

	const questionCount = useMemo(() => {
		return page.elements.filter(
			(el) => el.type !== 'NG::Soomo::Text' && el.type !== 'NG::Soomo::QuestionDeck'
		).length;
	}, []);

	const handleToggleView = useCallback(() => {
		setInstructorView((old) => !old);
		setAnsweredQuestionsMap({});
	}, []);

	useCustomEventListener<SQRSaveResponse>('question-saved', (json) => {
		setAnsweredQuestionsMap((old) => ({
			...old,
			[json.pool_family_id]: json
		}));
	});

	useCustomEventListener<SQRResetResponse>('question-reset', (json) => {
		setAnsweredQuestionsMap((old) => {
			const newMap = { ...old };
			delete newMap[json.pool_family_id];
			return newMap;
		});
	});

	return (
		<ThemeProvider theme={themes['universal_velvet']}>
			<TopBar>
				<button onClick={handleToggleView}>
					Switch to {isInstructorView ? 'Student' : 'Instructor'} View
				</button>
			</TopBar>
			<main css={mainStyles}>
				<TopPageInfo
					pageTitle="Pooled Sample Page"
					numAttempted={numAttempted}
					numCorrect={numCorrect}
					total={questionCount}
					isInstructorView={isInstructorView}
				/>
				<PageElements elements={page.elements} isInstructorView={isInstructorView} />
				<BottomPageInfoAndLinks
					numAttempted={numAttempted}
					numCorrect={numCorrect}
					total={questionCount}
					onBackLinkClick={backUrl ? () => router.push(backUrl) : undefined}
					onNextLinkClick={nextUrl ? () => router.push(nextUrl) : undefined}
					isInstructorView={isInstructorView}
				/>
			</main>
			<AriaLiveAnnouncer />
		</ThemeProvider>
	);
};
export default Layout;

const mainStyles = css`
	padding-top: 1.5rem;
	max-width: 800px;
	margin: 0 auto;

	@media (max-width: ${breakpoints.small}) {
		width: 90%;
	}
`;
